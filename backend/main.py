"""FastAPI application — booking system backend.

Module dependency graph:
  main.py → schemas.py (validation) → models.py (DB schema)
         → database.py (session mgmt) → SQLAlchemy → MySQL 8.4
         → reportlab (PDF generation)
         → slowapi (rate limiting)

Price convention: ALL prices stored as integer DA (1 DA = 1 unit).
  1500 = 1500 DA. Display as-is. No division needed.
  WHY: Algeria uses whole dinars for salon pricing. Centimes not used.

Token convention: Admin tokens are 32-char hex UUIDs stored in-memory.
  TTL = 2 hours. WHY: Balances admin convenience with security —
  stolen tokens expire quickly, but admins don't re-login constantly.
"""
from calendar import monthrange
from datetime import datetime, date, time, timedelta, UTC
from zoneinfo import ZoneInfo

TZ_ALGIERS = ZoneInfo("Africa/Algiers")
from io import BytesIO
from typing import Optional
import os, uuid, time as _time, secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import get_db, Base, engine
from models import (
    Service, Availability, ScheduleOverride, BlockedSlot,
    Appointment, AppointmentStatus, Setting,
)
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

import schemas

# ═══════════════════════════════════════════
#  UTILITY FUNCTIONS
# ═══════════════════════════════════════════


def get_or_404(db, model, obj_id, label="Resource"):
    obj = db.query(model).filter(model.id == obj_id).first()
    if not obj:
        raise HTTPException(404, f"{label} introuvable")
    return obj


def apply_partial_update(obj, data):
    for k, v in data.model_dump(exclude_unset=True).items():
        if k in ("start_time", "end_time") and isinstance(v, str):
            v = time.fromisoformat(v)
        setattr(obj, k, v)


def enrich_appointment_out(apt, out):
    out.service_name = apt.service_name or (apt.service.name if apt.service else None)
    if apt.service:
        out.service_duration = apt.service.duration_minutes
        out.service_price = apt.service.price


def _check_slot_conflicts(db, start, end, service_ids, exclude_appointment_id=None):
    """Check for appointment/blocked-slot conflicts and availability.
    service_ids can be a single int or a list for multi-service.
    
    Uses SELECT FOR UPDATE to serialize concurrent bookings on overlapping
    time ranges, preventing double-booking race conditions."""
    # Normalize
    ids = service_ids if isinstance(service_ids, list) else [service_ids]

    # Overlapping appointments — lock rows to prevent concurrent inserts
    conflict_q = db.query(Appointment).with_for_update().filter(
        Appointment.start_time < end,
        Appointment.end_time > start,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.pending]),
    )
    if exclude_appointment_id is not None:
        conflict_q = conflict_q.filter(Appointment.id != exclude_appointment_id)
    if conflict_q.first():
        raise HTTPException(409, "Ce créneau n'est plus disponible")

    # Blocked slots — also lock
    blocked = db.query(BlockedSlot).with_for_update().filter(
        BlockedSlot.start_time < end,
        BlockedSlot.end_time > start,
    ).first()
    if blocked:
        raise HTTPException(409, "Ce créneau est bloqué")

    # Availability (use multi-service slots)
    target_date = start.date()
    slots = get_available_slots(db, target_date, service_ids=ids)
    slot_keys = {(s["start"], s["end"]) for s in slots}
    slot_key = (start.strftime("%Y-%m-%dT%H:%M"), end.strftime("%Y-%m-%dT%H:%M"))
    if slot_key not in slot_keys:
        raise HTTPException(409, "Ce créneau n'est pas disponible")


# ═══════════════════════════════════════════
#  APP & MIDDLEWARE
# ═══════════════════════════════════════════

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Salon Amira — Réservation", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════
#  ADMIN AUTH — Token-based password protection
# ═══════════════════════════════════════════

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")
_admin_tokens: dict[str, float] = {}  # token → expiry timestamp
TOKEN_TTL = 3600 * 2  # 2 hours

def verify_admin_token(authorization: Optional[str] = Header(None)) -> str:
    """Dependency: validate Bearer token, return token if valid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentification requise")
    token = authorization[7:]
    expiry = _admin_tokens.get(token)
    if expiry is None:
        raise HTTPException(401, "Token invalide")
    if _time.time() > expiry:
        del _admin_tokens[token]
        raise HTTPException(401, "Token expiré")
    return token

def verify_admin_token_optional(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Like verify_admin_token but returns None instead of raising 401."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    expiry = _admin_tokens.get(token)
    if expiry is None:
        return None
    if _time.time() > expiry:
        del _admin_tokens[token]
        return None
    return token


@app.post("/api/admin/login")
@limiter.limit("5/minute")
def admin_login(data: schemas.AdminLogin, request: Request):
    """Authenticate with admin password, return a session token."""
    if not secrets.compare_digest(data.password, ADMIN_PASSWORD):
        raise HTTPException(401, "Mot de passe incorrect")
    token = uuid.uuid4().hex
    _admin_tokens[token] = _time.time() + TOKEN_TTL
    return {"token": token}

@app.post("/api/admin/logout")
def admin_logout(token: str = Depends(verify_admin_token)):
    """Invalidate the current admin session."""
    _admin_tokens.pop(token, None)
    return {"ok": True}

@app.get("/api/admin/check")
def admin_check(token: str = Depends(verify_admin_token)):
    """Verify the current token is still valid."""
    return {"valid": True}


# ═══════════════════════════════════════════
#  SLOT CALCULATION — Core business logic
# ═══════════════════════════════════════════

def _subtract_blocks(ranges, blocks, day_start, day_end):
    """Subtract a list of objects (with start_time/end_time) from time ranges."""
    for block in blocks:
        block_start = max(block.start_time, day_start).time()
        block_end = min(block.end_time, day_end).time()
        if block_end <= time.min:
            # WHY time(23,59,59): full end-of-day boundary. Appointments
            # cannot cross midnight — 23:59:59 is the last valid second.
            block_end = time(23, 59, 59)
        new_ranges = []
        for slot_start, slot_end in ranges:
            if block_end <= slot_start or block_start >= slot_end:
                new_ranges.append((slot_start, slot_end))
            else:
                if slot_start < block_start:
                    new_ranges.append((slot_start, block_start))
                if block_end < slot_end:
                    new_ranges.append((block_end, slot_end))
        ranges = new_ranges
    return ranges


def get_available_slots(
    db: Session,
    target_date: date,
    service_id: int = None,
    service_ids: list[int] = None,
) -> list[dict]:
    """
    Calculate all available slots for a given date and service(s).

    When multiple service_ids are provided, total_duration = sum of all service durations.
    The returned slots represent the START time of the full block.

    Priority:
    1. Schedule overrides (exceptions de date)
    2. Recurring availabilities
    3. Subtract blocked slots
    4. Subtract existing appointments
    5. Slice into slots based on total duration

    WHY this order: Overrides MUST trump recurring rules — otherwise
    holiday closures and special hours do not work. Blocked slots and
    existing appointments prevent double-booking.
    """
    # Resolve services and compute total duration
    ids = service_ids or ([service_id] if service_id else [])
    if not ids:
        return []

    services = db.query(Service).filter(
        Service.id.in_(ids), Service.is_active == True
    ).all()

    if len(services) != len(ids):
        return []  # one or more services invalid/inactive

    total_duration = sum(s.duration_minutes for s in services)
    dow = target_date.weekday()  # 0=lundi

    # ── Step 1+2: Get base availability ──
    override = db.query(ScheduleOverride).filter(
        ScheduleOverride.override_date == target_date
    ).first()

    original_ranges = []  # saved for Passe 2 merge

    if override and not override.is_available:
        return []

    if override and override.is_available and override.start_time and override.end_time:
        original_ranges = [(override.start_time, override.end_time)]
    elif override and override.is_available and not override.start_time:
        pass  # fall through to recurring

    if not original_ranges:
        avails = db.query(Availability).filter(
            Availability.day_of_week == dow,
            or_(
                Availability.valid_from.is_(None),
                Availability.valid_from <= target_date,
            ),
            or_(
                Availability.valid_until.is_(None),
                Availability.valid_until >= target_date,
            ),
        ).all()
        if not avails:
            return []
        original_ranges = [(a.start_time, a.end_time) for a in avails]

    # ── Step 3: Subtract blocked slots ──
    day_start = datetime.combine(target_date, time.min)
    day_end = datetime.combine(target_date, time.max)

    blocked = db.query(BlockedSlot).filter(
        BlockedSlot.start_time < day_end,
        BlockedSlot.end_time > day_start,
    ).all()

    ranges = list(original_ranges)
    ranges = _subtract_blocks(ranges, blocked, day_start, day_end)

    # ── Step 4: Subtract existing appointments ──
    appointments = db.query(Appointment).filter(
        Appointment.start_time < day_end,
        Appointment.end_time > day_start,
        Appointment.status.in_([
            AppointmentStatus.confirmed,
            AppointmentStatus.pending,
        ]),
    ).all()

    ranges = _subtract_blocks(ranges, appointments, day_start, day_end)

    # ── Step 5: Slice into slots ──
    slots = []
    for s, e in ranges:
        current_h = s.hour
        current_m = s.minute
        end_minutes = e.hour * 60 + e.minute

        while True:
            start_minutes = current_h * 60 + current_m
            if start_minutes + total_duration > end_minutes:
                break

            slot_start = f"{current_h:02d}:{current_m:02d}"
            end_m = start_minutes + total_duration
            slot_end = f"{end_m // 60:02d}:{end_m % 60:02d}"

            slots.append({
                "start": f"{target_date.isoformat()}T{slot_start}",
                "end": f"{target_date.isoformat()}T{slot_end}",
            })

            current_m += total_duration
            while current_m >= 60:
                current_h += 1
                current_m -= 60

    # ── Passe 2: Merge plages si aucun créneau trouvé ──
    if not slots and len(original_ranges) > 1:
        # Sort and merge original ranges into one continuous plage
        sorted_orig = sorted(original_ranges)
        merged_start = sorted_orig[0][0]
        merged_end = sorted_orig[-1][1]
        merged = [(merged_start, merged_end)]

        # Detect breaks between original plages
        breaks = []
        for i in range(len(sorted_orig) - 1):
            gap_start = sorted_orig[i][1]
            gap_end = sorted_orig[i + 1][0]
            if gap_start < gap_end:
                breaks.append((gap_start, gap_end))

        # Re-subtract blocked + appointments from merged range
        merged_ranges = _subtract_blocks(merged, blocked, day_start, day_end)
        merged_ranges = _subtract_blocks(merged_ranges, appointments, day_start, day_end)

        # Slice merged ranges
        for s, e in merged_ranges:
            current_h = s.hour
            current_m = s.minute
            end_minutes = e.hour * 60 + e.minute

            while True:
                start_minutes = current_h * 60 + current_m
                if start_minutes + total_duration > end_minutes:
                    break

                slot_start = f"{current_h:02d}:{current_m:02d}"
                end_m = start_minutes + total_duration
                slot_end = f"{end_m // 60:02d}:{end_m % 60:02d}"

                # Build segments: which parts of the slot fall in which original plage?
                slot_start_min = start_minutes
                slot_end_min = end_m
                segments = []
                has_break = False

                for orig_s, orig_e in sorted_orig:
                    orig_start_min = orig_s.hour * 60 + orig_s.minute
                    orig_end_min = orig_e.hour * 60 + orig_e.minute
                    seg_start = max(slot_start_min, orig_start_min)
                    seg_end = min(slot_end_min, orig_end_min)
                    if seg_start < seg_end:
                        segments.append({
                            "start": f"{seg_start // 60:02d}:{seg_start % 60:02d}",
                            "end": f"{seg_end // 60:02d}:{seg_end % 60:02d}",
                        })

                # Check if slot crosses a break
                for bs, be in breaks:
                    bs_min = bs.hour * 60 + bs.minute
                    be_min = be.hour * 60 + be.minute
                    if slot_start_min < be_min and slot_end_min > bs_min:
                        has_break = True
                        break

                slots.append({
                    "start": f"{target_date.isoformat()}T{slot_start}",
                    "end": f"{target_date.isoformat()}T{slot_end}",
                    "segments": segments,
                    "has_break": has_break,
                })

                current_m += total_duration
                while current_m >= 60:
                    current_h += 1
                    current_m -= 60

    # Ensure all slots have segments/has_break fields
    for s in slots:
        s.setdefault("segments", [])
        s.setdefault("has_break", False)

    return slots


# ═══════════════════════════════════════════
#  PDF GENERATION
# ═══════════════════════════════════════════

def generate_confirmation_pdf(appointment: Appointment, db: Session = None) -> BytesIO:
    """Generate a confirmation PDF. If the appointment has a booking_ref, include all siblings."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A5, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=18, alignment=TA_CENTER, spaceAfter=6*mm)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=11, alignment=TA_CENTER, textColor=colors.HexColor("#666"))
    label_style = ParagraphStyle("Label", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#888"))
    value_style = ParagraphStyle("Value", parent=styles["Normal"], fontSize=11, alignment=TA_LEFT)
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor("#999"))

    # Gather all appointments in this booking
    if appointment.booking_ref and db:
        all_apts = db.query(Appointment).options(joinedload(Appointment.service)).filter(
            Appointment.booking_ref == appointment.booking_ref
        ).order_by(Appointment.sort_order).all()
    else:
        all_apts = [appointment]

    date_str = appointment.start_time.strftime("%d/%m/%Y")
    total_price = sum(a.service.price for a in all_apts if a.service)
    total_duration = sum(a.service.duration_minutes for a in all_apts if a.service)

    # Build service rows
    data = []
    for apt in all_apts:
        svc = apt.service
        if svc:
            time_range = f"{apt.start_time.strftime('%H:%M')} – {apt.end_time.strftime('%H:%M')}"
            data.append([f"{svc.name} ({svc.duration_minutes} min)", time_range])

    if len(all_apts) > 1:
        data.append(["Total", f"{total_duration} min · {total_price:,} DA".replace(",", " ")])
        data.append(["Date", date_str])
    else:
        data.insert(0, ["Date", date_str])

    data.append(["Client", appointment.client_name])
    data.append(["Téléphone", appointment.client_phone])
    data.append(["Adresse", "12 Rue Didouche, Alger Centre"])

    table = Table(data, colWidths=[70*mm, 70*mm])
    table_style_cmds = [
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#888")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#eee")),
        ("ALIGN", (1, 0), (1, -1), "LEFT"),
    ]
    # Bold the total row if present
    if len(all_apts) > 1:
        total_row = len(all_apts)
        table_style_cmds.append(("FONTNAME", (0, total_row), (-1, total_row), "Helvetica-Bold"))
    table.setStyle(TableStyle(table_style_cmds))

    elements = [
        Paragraph("Rendez-vous confirmé ✅", title_style),
        Paragraph("Salon Amira — Coiffure & Soins", subtitle_style),
        Spacer(1, 10*mm),
        table,
        Spacer(1, 12*mm),
        Paragraph("Présentez ce récapitulatif à votre arrivée.", footer_style),
        Paragraph("Pour modifier ou annuler, contactez-nous au 0550 00 00 00.", footer_style),
    ]

    doc.build(elements)
    buffer.seek(0)
    return buffer


# ═══════════════════════════════════════════
#  ROUTES — Services
# ═══════════════════════════════════════════

@app.get("/api/services")
def list_services(db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.is_active == True).all()


@app.get("/api/services/all")
def list_all_services(db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    """Provider view — all services, including inactive (for enable/disable toggle)."""
    return db.query(Service).order_by(Service.is_active.desc(), Service.name).all()


@app.post("/api/services", response_model=schemas.ServiceOut)
def create_service(data: schemas.ServiceCreate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    srv = Service(**data.model_dump())
    db.add(srv)
    db.commit()
    db.refresh(srv)
    return srv


@app.put("/api/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(service_id: int, data: schemas.ServiceUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    srv = get_or_404(db, Service, service_id, "Service")
    apply_partial_update(srv, data)
    db.commit()
    db.refresh(srv)
    return srv


@app.delete("/api/services/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    srv = get_or_404(db, Service, service_id, "Service")
    db.delete(srv)
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════
#  ROUTES — Availabilities (plages récurrentes)
# ═══════════════════════════════════════════

@app.get("/api/availabilities")
def list_availabilities(db: Session = Depends(get_db)):
    return db.query(Availability).order_by(Availability.day_of_week, Availability.start_time).all()


@app.post("/api/availabilities", response_model=schemas.AvailabilityOut)
def create_availability(data: schemas.AvailabilityCreate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    av = Availability(
        day_of_week=data.day_of_week,
        start_time=time.fromisoformat(data.start_time),
        end_time=time.fromisoformat(data.end_time),
        valid_from=data.valid_from,
        valid_until=data.valid_until,
    )
    db.add(av)
    db.commit()
    db.refresh(av)
    return {
        "id": av.id,
        "day_of_week": av.day_of_week,
        "start_time": str(av.start_time),
        "end_time": str(av.end_time),
        "valid_from": av.valid_from,
        "valid_until": av.valid_until,
    }


@app.delete("/api/availabilities/{avail_id}")
def delete_availability(avail_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    av = get_or_404(db, Availability, avail_id, "Plage")
    db.delete(av)
    db.commit()
    return {"ok": True}


@app.put("/api/availabilities/{avail_id}", response_model=schemas.AvailabilityOut)
def update_availability(avail_id: int, data: schemas.AvailabilityUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    av = get_or_404(db, Availability, avail_id, "Plage")
    apply_partial_update(av, data)
    db.commit()
    db.refresh(av)
    return av


# ═══════════════════════════════════════════
#  ROUTES — Schedule Overrides (exceptions)
# ═══════════════════════════════════════════

@app.get("/api/overrides")
def list_overrides(db: Session = Depends(get_db)):
    return db.query(ScheduleOverride).order_by(ScheduleOverride.override_date).all()


@app.post("/api/overrides", response_model=schemas.OverrideOut)
def create_override(data: schemas.OverrideCreate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    existing = db.query(ScheduleOverride).filter(
        ScheduleOverride.override_date == data.override_date
    ).first()
    if existing:
        raise HTTPException(409, "Une exception existe déjà pour cette date")

    ov = ScheduleOverride(
        override_date=data.override_date,
        start_time=time.fromisoformat(data.start_time) if data.start_time else None,
        end_time=time.fromisoformat(data.end_time) if data.end_time else None,
        is_available=data.is_available,
        reason=data.reason,
    )
    db.add(ov)
    db.commit()
    db.refresh(ov)
    return ov


@app.delete("/api/overrides/{override_id}")
def delete_override(override_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    ov = get_or_404(db, ScheduleOverride, override_id, "Exception")
    db.delete(ov)
    db.commit()
    return {"ok": True}


@app.put("/api/overrides/{override_id}", response_model=schemas.OverrideOut)
def update_override(override_id: int, data: schemas.OverrideUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    ov = get_or_404(db, ScheduleOverride, override_id, "Exception")
    apply_partial_update(ov, data)
    db.commit()
    db.refresh(ov)
    return ov


# ═══════════════════════════════════════════
#  ROUTES — Blocked Slots
# ═══════════════════════════════════════════

@app.get("/api/blocked-slots")
def list_blocked_slots(db: Session = Depends(get_db)):
    return db.query(BlockedSlot).order_by(BlockedSlot.start_time.desc()).all()


@app.post("/api/blocked-slots", response_model=schemas.BlockedSlotOut)
def create_blocked_slot(data: schemas.BlockedSlotCreate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    bs = BlockedSlot(**data.model_dump())
    db.add(bs)
    db.commit()
    db.refresh(bs)
    return bs


@app.delete("/api/blocked-slots/{slot_id}")
def delete_blocked_slot(slot_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    bs = get_or_404(db, BlockedSlot, slot_id, "Créneau bloqué")
    db.delete(bs)
    db.commit()
    return {"ok": True}


@app.put("/api/blocked-slots/{slot_id}", response_model=schemas.BlockedSlotOut)
def update_blocked_slot(slot_id: int, data: schemas.BlockedSlotUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    bs = get_or_404(db, BlockedSlot, slot_id, "Créneau bloqué")
    apply_partial_update(bs, data)
    db.commit()
    db.refresh(bs)
    return bs


# ═══════════════════════════════════════════
#  ROUTES — Slots (disponibilité côté client)
# ═══════════════════════════════════════════

@app.get("/api/slots", response_model=list[schemas.SlotOut])
def get_slots(
    target_date: str = Query(description="YYYY-MM-DD", alias="date"),
    service_id: Optional[int] = Query(default=None),
    service_ids: Optional[str] = Query(default=None, description="Comma-separated IDs for multi-service"),
    db: Session = Depends(get_db),
):
    target = date.fromisoformat(target_date)

    ids = None
    if service_ids:
        ids = [int(x.strip()) for x in service_ids.split(",") if x.strip()]
    elif service_id:
        ids = [service_id]

    if not ids:
        raise HTTPException(400, "service_id ou service_ids requis")

    slots = get_available_slots(db, target, service_ids=ids)
    return slots


@app.get("/api/slots/month")
def get_month_availability(
    month: str = Query(description="YYYY-MM"),
    service_ids: str = Query(description="Comma-separated service IDs"),
    db: Session = Depends(get_db),
):
    """Return has_slots / slot_count for every day in the month. Used by calendar red-dot indicator."""
    ids = [int(x.strip()) for x in service_ids.split(",") if x.strip()]
    if not ids:
        raise HTTPException(400, "service_ids requis")

    year, mon = [int(x) for x in month.split("-")]
    _, days_in_month = monthrange(year, mon)

    result = []
    for day in range(1, days_in_month + 1):
        d = date(year, mon, day)
        slots = get_available_slots(db, d, service_ids=ids)
        result.append({
            "date": d.isoformat(),
            "has_slots": len(slots) > 0,
            "slot_count": len(slots),
        })

    return {"days": result}


@app.get("/api/slots/week", response_model=list[schemas.DaySlots])
def get_week_slots(
    start_date: str = Query(description="YYYY-MM-DD"),
    service_id: Optional[int] = Query(default=None),
    service_ids: Optional[str] = Query(default=None, description="Comma-separated IDs"),
    db: Session = Depends(get_db),
):
    ids = None
    if service_ids:
        ids = [int(x.strip()) for x in service_ids.split(",") if x.strip()]
    elif service_id:
        ids = [service_id]
    if not ids:
        raise HTTPException(400, "service_id ou service_ids requis")

    start = date.fromisoformat(start_date)
    result = []
    for i in range(7):
        d = start + timedelta(days=i)
        slots = get_available_slots(db, d, service_ids=ids)
        result.append({
            "date": d.isoformat(),
            "slots": slots,
        })
    return result


@app.get("/api/slots/next")
def get_next_available_day(
    service_ids: str = Query(description="Comma-separated service IDs"),
    from_date: Optional[str] = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    max_days: int = Query(default=14, le=30, description="Max days to search ahead"),
    db: Session = Depends(get_db),
):
    """Find the closest day with available slots for the selected services."""
    ids = [int(x.strip()) for x in service_ids.split(",") if x.strip()]
    if not ids:
        raise HTTPException(400, "service_ids requis")

    start = date.fromisoformat(from_date) if from_date else date.today()

    for offset in range(max_days):
        d = start + timedelta(days=offset)
        slots = get_available_slots(db, d, service_ids=ids)
        if slots:
            return {
                "date": d.isoformat(),
                "days_ahead": offset,
                "slots": slots,
            }

    return {
        "date": None,
        "days_ahead": None,
        "slots": [],
        "message": f"Aucun créneau trouvé dans les {max_days} prochains jours",
    }


# ═══════════════════════════════════════════
#  ROUTES — Appointments
# ═══════════════════════════════════════════

@app.post("/api/appointments", response_model=list[schemas.AppointmentOut])
@limiter.limit("10/minute")
def create_appointment(data: schemas.AppointmentCreate, request: Request, db: Session = Depends(get_db)):
    """Create one or more linked appointments (multi-service booking)."""
    # Resolve service IDs
    ids = data.service_ids or ([data.service_id] if data.service_id else [])
    if not ids:
        raise HTTPException(400, "Au moins un service requis")

    services = db.query(Service).filter(
        Service.id.in_(ids), Service.is_active == True
    ).order_by(Service.id).all()

    if len(services) != len(ids):
        raise HTTPException(400, "Un ou plusieurs services sont invalides ou inactifs")

    start = data.start_time
    total_duration = sum(s.duration_minutes for s in services)
    block_end = start + timedelta(minutes=total_duration)

    # Validate the full block is available
    _check_slot_conflicts(db, start, block_end, ids)

    # Generate booking reference for multi-service
    # Uses timestamp+random — no race condition possible.
    booking_ref = None
    if len(services) > 1:
        booking_ref = f"SA-{start.strftime('%y%m%d%H%M%S')}-{secrets.token_hex(2)}"

    # Create appointments sequentially
    current = start
    result = []
    for i, svc in enumerate(services):
        svc_end = current + timedelta(minutes=svc.duration_minutes)

        # Check individual slot
        if i > 0:  # first slot already validated above
            _check_slot_conflicts(db, current, svc_end, svc.id)

        apt = Appointment(
            service_id=svc.id,
            service_name=svc.name,
            client_name=data.client_name,
            client_phone=data.client_phone,
            start_time=current,
            end_time=svc_end,
            status=AppointmentStatus.confirmed,
            booking_ref=booking_ref,
            sort_order=i + 1,
        )
        db.add(apt)
        db.flush()  # get the ID for conflict checks of subsequent services
        db.refresh(apt)

        out = schemas.AppointmentOut.model_validate(apt)
        enrich_appointment_out(apt, out)
        result.append(out)

        current = svc_end

    db.commit()
    return result


@app.get("/api/appointments", response_model=list[schemas.AppointmentOut])
def list_appointments(
    target_date: Optional[str] = Query(default=None, alias="date"),
    phone: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(verify_admin_token_optional),
):
    # Allow unauthenticated access ONLY for phone-based client lookup.
    # All other access (date filter, no filter, status filter) requires admin auth.
    if not phone:
        if not token:
            raise HTTPException(401, "Authentification requise")
    else:
        # Client self-service: only allow searching by their own phone
        pass
    q = db.query(Appointment).options(joinedload(Appointment.service))

    if target_date:
        d = date.fromisoformat(target_date)
        day_start = datetime.combine(d, time.min)
        day_end = datetime.combine(d, time.max)
        q = q.filter(Appointment.start_time >= day_start, Appointment.start_time <= day_end)

    if phone:
        # Group by booking_ref when searching by phone
        phone_clean = phone.strip()
        q = q.filter(Appointment.client_phone == phone_clean)

    appointments = q.order_by(Appointment.start_time).all()

    result = []
    booked_refs = set()
    for apt in appointments:
        out = schemas.AppointmentOut.model_validate(apt)
        enrich_appointment_out(apt, out)
        result.append(out)

        # If this is part of a multi-service booking, add siblings
        if apt.booking_ref and apt.booking_ref not in booked_refs:
            booked_refs.add(apt.booking_ref)
            siblings = db.query(Appointment).options(joinedload(Appointment.service)).filter(
                Appointment.booking_ref == apt.booking_ref,
                Appointment.id != apt.id,
            ).order_by(Appointment.sort_order).all()
            for sib in siblings:
                sout = schemas.AppointmentOut.model_validate(sib)
                enrich_appointment_out(sib, sout)
                result.append(sout)

    return result


@app.get("/api/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    apt = db.query(Appointment).options(joinedload(Appointment.service)).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")
    out = schemas.AppointmentOut.model_validate(apt)
    enrich_appointment_out(apt, out)
    return out


@app.put("/api/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    data: schemas.AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_token),
):
    apt = get_or_404(db, Appointment, appointment_id, "Rendez-vous")
    apt.status = AppointmentStatus(data.status)
    db.commit()
    return {"ok": True}


@app.get("/api/appointments/{appointment_id}/pdf")
@limiter.limit("20/minute")
def download_appointment_pdf(appointment_id: int, request: Request, db: Session = Depends(get_db)):
    apt = get_or_404(db, Appointment, appointment_id, "Rendez-vous")
    buffer = generate_confirmation_pdf(apt, db)
    filename = f"rdv_{apt.client_phone}_{apt.start_time.strftime('%Y%m%d_%H%M')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════
#  ROUTES — Appointment Management
# ═══════════════════════════════════════════

@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    """Cancel a single appointment or the entire multi-service group."""
    apt = get_or_404(db, Appointment, appointment_id, "Rendez-vous")

    if apt.booking_ref:
        # Cancel entire group
        siblings = db.query(Appointment).filter(
            Appointment.booking_ref == apt.booking_ref
        ).all()
        count = len(siblings)
        for sib in siblings:
            sib.status = AppointmentStatus.cancelled
    else:
        apt.status = AppointmentStatus.cancelled
        count = 1

    db.commit()
    return {"ok": True, "cancelled_count": count}


@app.put("/api/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def update_appointment(appointment_id: int, data: schemas.AppointmentUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    apt = db.query(Appointment).options(joinedload(Appointment.service)).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")

    apply_partial_update(apt, data)

    # Recalculate end_time and check conflicts if start_time changed
    if data.start_time is not None and apt.service:
        duration = apt.service.duration_minutes
        apt.end_time = apt.start_time + timedelta(minutes=duration)
        _check_slot_conflicts(db, apt.start_time, apt.end_time, apt.service_id, exclude_appointment_id=appointment_id)

    db.commit()
    db.refresh(apt)

    # Enrich with service info
    out = schemas.AppointmentOut.model_validate(apt)
    enrich_appointment_out(apt, out)
    return out


# ═══════════════════════════════════════════
#  ROUTES — Analytics & Stats
# ═══════════════════════════════════════════

@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    """Dashboard: today's summary + tomorrow's preparation data."""

    now = datetime.now(TZ_ALGIERS)
    today_date = now.date()
    tomorrow_date = today_date + timedelta(days=1)

    today_start = datetime.combine(today_date, time.min, tzinfo=TZ_ALGIERS)
    today_end = datetime.combine(today_date, time.max, tzinfo=TZ_ALGIERS)
    tomorrow_start = datetime.combine(tomorrow_date, time.min, tzinfo=TZ_ALGIERS)
    tomorrow_end = datetime.combine(tomorrow_date, time.max, tzinfo=TZ_ALGIERS)

    # ── Today's appointments ──
    today_appointments = db.query(Appointment).options(
        joinedload(Appointment.service)
    ).filter(
        Appointment.start_time >= today_start,
        Appointment.start_time <= today_end,
        Appointment.status != AppointmentStatus.cancelled
    ).order_by(Appointment.start_time).all()

    # ── Tomorrow's appointments ──
    tomorrow_appointments = db.query(Appointment).options(
        joinedload(Appointment.service)
    ).filter(
        Appointment.start_time >= tomorrow_start,
        Appointment.start_time <= tomorrow_end,
        Appointment.status != AppointmentStatus.cancelled
    ).order_by(Appointment.start_time).all()

    # Pre-compute which phones have any prior visit (single query instead of N+1)
    all_phones = list(set(
        a.client_phone for a in (today_appointments + tomorrow_appointments)
    ))
    if all_phones:
        prior_visits = db.query(
            Appointment.client_phone,
            func.count().label('cnt')
        ).filter(
            Appointment.client_phone.in_(all_phones),
            Appointment.status.in_([AppointmentStatus.completed, AppointmentStatus.confirmed])
        ).group_by(Appointment.client_phone).all()
        prior_map = {phone: cnt for phone, cnt in prior_visits}
    else:
        prior_map = {}

    today_list = []
    for a in today_appointments:
        previous_visits = prior_map.get(a.client_phone, 0)

        today_list.append({
            "id": a.id,
            "client_name": a.client_name,
            "client_phone": a.client_phone,
            "service_name": a.service_name or (a.service.name if a.service else "Service supprim\u00e9"),
            "start_time": a.start_time.isoformat(),
            "end_time": a.end_time.isoformat(),
            "status": a.status.value,
            "notes": a.notes,
            "previous_visits": previous_visits,
            "is_first_visit": previous_visits == 0,
        })

    # Today's revenue (confirmed + completed)
    today_revenue = db.query(
        func.coalesce(func.sum(Service.price), 0)
    ).select_from(Appointment).join(Service, Appointment.service_id == Service.id).filter(
        Appointment.start_time >= today_start,
        Appointment.start_time <= today_end,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed])
    ).scalar() or 0

    # Today's collected revenue (completed only)
    today_collected = db.query(
        func.coalesce(func.sum(Service.price), 0)
    ).select_from(Appointment).join(Service, Appointment.service_id == Service.id).filter(
        Appointment.start_time >= today_start,
        Appointment.start_time <= today_end,
        Appointment.status == AppointmentStatus.completed
    ).scalar() or 0

    # Today's status breakdown
    today_status = {"confirmed": 0, "pending": 0, "completed": 0, "no_show": 0}
    for a in today_appointments:
        if a.status.value in today_status:
            today_status[a.status.value] += 1

    # Completion rate
    today_completed = today_status.get("completed", 0)
    today_total = len(today_list)
    completion_rate = round(today_completed / max(today_total, 1) * 100)

    tomorrow_list = []
    for a in tomorrow_appointments:
        previous_visits = prior_map.get(a.client_phone, 0)

        tomorrow_list.append({
            "id": a.id,
            "client_name": a.client_name,
            "client_phone": a.client_phone,
            "service_name": a.service_name or (a.service.name if a.service else "Service supprim\u00e9"),
            "start_time": a.start_time.isoformat(),
            "end_time": a.end_time.isoformat(),
            "status": a.status.value,
            "notes": a.notes,
            "previous_visits": previous_visits,
            "is_first_visit": previous_visits == 0,
        })

    # Tomorrow's revenue (confirmed + pending)
    tomorrow_revenue = db.query(
        func.coalesce(func.sum(Service.price), 0)
    ).select_from(Appointment).join(Service, Appointment.service_id == Service.id).filter(
        Appointment.start_time >= tomorrow_start,
        Appointment.start_time <= tomorrow_end,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.pending])
    ).scalar() or 0

    # Tomorrow slot estimate: count gaps >= 30 min between appointments
    def _count_free_slots(appts, min_minutes=30):
        if not appts:
            return None
        sorted_apts = sorted(appts, key=lambda a: a.start_time)
        gaps = 0
        for i in range(len(sorted_apts) - 1):
            gap = (sorted_apts[i+1].start_time - sorted_apts[i].end_time).total_seconds() / 60
            gaps += int(gap / min_minutes)
        return gaps

    today_free_slots = _count_free_slots(today_appointments)
    tomorrow_free_slots = _count_free_slots(tomorrow_appointments)

    # ── Active services count ──
    active_services = db.query(Service).filter(Service.is_active == True).count()

    # ── This week's appointments ──
    weekday = today_date.weekday()
    week_start = today_date - timedelta(days=weekday)
    week_end = week_start + timedelta(days=6)
    week_start_dt = datetime.combine(week_start, time.min, tzinfo=TZ_ALGIERS)
    week_end_dt = datetime.combine(week_end, time.max, tzinfo=TZ_ALGIERS)

    week_count = db.query(Appointment).filter(
        Appointment.start_time >= week_start_dt,
        Appointment.start_time <= week_end_dt,
        Appointment.status != AppointmentStatus.cancelled
    ).count()

    # ── Total + unique ──
    total_count = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.cancelled
    ).count()

    unique_clients = db.query(func.count(func.distinct(Appointment.client_phone))).filter(
        Appointment.status != AppointmentStatus.cancelled
    ).scalar() or 0

    return {
        "today": {
            "date": today_date.isoformat(),
            "appointments": today_list,
            "total_count": len(today_list),
            "revenue": today_revenue,
            "collected": today_collected,
            "status_breakdown": today_status,
            "completion_rate": completion_rate,
            "free_slots": today_free_slots,
        },
        "tomorrow": {
            "date": tomorrow_date.isoformat(),
            "appointments": tomorrow_list,
            "total_count": len(tomorrow_list),
            "revenue": tomorrow_revenue,
            "free_slots": tomorrow_free_slots,
        },
        "quick_stats": {
            "active_services": active_services,
            "week_appointments": week_count,
            "total_appointments": total_count,
            "unique_clients": unique_clients,
        },
    }


@app.get("/api/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_token),
    start_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
):
    """Analytics with configurable date range: revenue trend, service breakdown, client stats, rates."""

    now = datetime.now(TZ_ALGIERS)
    today = now.date()

    # Parse date range — default to last 30 days
    if start_date and end_date:
        range_start = datetime.combine(date.fromisoformat(start_date), time.min, tzinfo=TZ_ALGIERS)
        range_end = datetime.combine(date.fromisoformat(end_date), time.max, tzinfo=TZ_ALGIERS)
    else:
        range_start = datetime.combine(today - timedelta(days=30), time.min, tzinfo=TZ_ALGIERS)
        range_end = datetime.combine(today, time.max, tzinfo=TZ_ALGIERS)

    # Previous period (same length)
    period_days = (range_end.date() - range_start.date()).days + 1
    prev_start = range_start - timedelta(days=period_days)
    prev_end = range_start - timedelta(seconds=1)

    # ── Revenue daily breakdown ──
    daily_revenue = db.query(
        func.date(Appointment.start_time).label("day"),
        func.coalesce(func.sum(Service.price), 0).label("revenue")
    ).select_from(Appointment).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Appointment.start_time >= range_start,
        Appointment.start_time <= range_end,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed])
    ).group_by(func.date(Appointment.start_time)).order_by("day").all()

    revenue_chart = [
        {"date": str(d.day), "revenue": d.revenue} for d in daily_revenue
    ]

    # ── Previous period revenue ──
    prev_daily_revenue = db.query(
        func.date(Appointment.start_time).label("day"),
        func.coalesce(func.sum(Service.price), 0).label("revenue")
    ).select_from(Appointment).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Appointment.start_time >= prev_start,
        Appointment.start_time <= prev_end,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed])
    ).group_by(func.date(Appointment.start_time)).order_by("day").all()

    # Map previous period days forward for overlay comparison
    offset_days = (range_start.date() - prev_start.date()).days
    prev_revenue = {}
    for d in prev_daily_revenue:
        shifted = date.fromisoformat(str(d.day)) + timedelta(days=offset_days)
        prev_revenue[str(shifted)] = d.revenue

    # ── Service breakdown (ALL services, not just top 5) ──
    all_services = db.query(
        Service.name,
        func.count(Appointment.id).label("count"),
        func.coalesce(func.sum(Service.price), 0).label("revenue")
    ).select_from(Appointment).join(
        Service, Appointment.service_id == Service.id
    ).filter(
        Appointment.start_time >= range_start,
        Appointment.start_time <= range_end,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed])
    ).group_by(Service.name).order_by(func.count(Appointment.id).desc()).all()

    services_breakdown = [
        {"name": s.name, "count": s.count, "revenue": s.revenue}
        for s in all_services
    ]

    # ── Appointments in range ──
    range_appointments = db.query(Appointment).filter(
        Appointment.start_time >= range_start,
        Appointment.start_time <= range_end,
        Appointment.status != AppointmentStatus.cancelled
    )

    total_in_range = range_appointments.count()

    # ── Status breakdown ──
    status_counts = db.query(
        Appointment.status,
        func.count(Appointment.id)
    ).filter(
        Appointment.start_time >= range_start,
        Appointment.start_time <= range_end
    ).group_by(Appointment.status).all()

    status_breakdown = {s.status.value: s[1] for s in status_counts}

    confirmed_count = status_breakdown.get("confirmed", 0)
    completed_count = status_breakdown.get("completed", 0)
    cancelled_count = status_breakdown.get("cancelled", 0)
    no_show_count = status_breakdown.get("no_show", 0)
    pending_count = status_breakdown.get("pending", 0)

    total_for_rates = max(confirmed_count + completed_count + cancelled_count + no_show_count, 1)
    cancellation_rate = round(cancelled_count / total_for_rates * 100)
    no_show_rate = round(no_show_count / total_for_rates * 100)
    completion_rate = round(completed_count / max(confirmed_count + completed_count, 1) * 100)

    # ── Revenue totals ──
    range_revenue = sum(d["revenue"] for d in revenue_chart)
    prev_range_revenue = sum(prev_revenue.values())

    revenue_change = round((range_revenue - prev_range_revenue) / max(prev_range_revenue, 1) * 100) if prev_range_revenue > 0 else None

    # ── New vs recurring clients ──
    # Single query: find all phones with prior appointments (instead of N+1 loop)
    clients_in_range = db.query(func.distinct(Appointment.client_phone)).filter(
        Appointment.start_time >= range_start,
        Appointment.start_time <= range_end,
        Appointment.status != AppointmentStatus.cancelled
    ).all()

    client_phones = [c[0] for c in clients_in_range]
    new_clients = 0
    recurring_clients = 0

    if client_phones:
        # One query: all phones that have ANY appointment before range_start
        prior_phones = set(
            p[0] for p in db.query(func.distinct(Appointment.client_phone)).filter(
                Appointment.client_phone.in_(client_phones),
                Appointment.start_time < range_start,
                Appointment.status != AppointmentStatus.cancelled
            ).all()
        )
        recurring_clients = sum(1 for phone in client_phones if phone in prior_phones)
        new_clients = len(client_phones) - recurring_clients

    # ── Total all-time ──
    total_apts = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.cancelled
    ).count()

    unique_clients = db.query(func.count(func.distinct(Appointment.client_phone))).filter(
        Appointment.status != AppointmentStatus.cancelled
    ).scalar() or 0

    return {
        "period": {
            "start": range_start.date().isoformat(),
            "end": range_end.date().isoformat(),
        },
        "revenue_chart": revenue_chart,
        "prev_revenue_map": prev_revenue,
        "services_breakdown": services_breakdown,
        "total_appointments": total_apts,
        "appointments_in_range": total_in_range,
        "range_revenue": range_revenue,
        "prev_range_revenue": prev_range_revenue,
        "revenue_change_pct": revenue_change,
        "status_breakdown": status_breakdown,
        "cancellation_rate": cancellation_rate,
        "no_show_rate": no_show_rate,
        "completion_rate": completion_rate,
        "new_clients": new_clients,
        "recurring_clients": recurring_clients,
        "unique_clients": unique_clients,
    }


# ═══════════════════════════════════════════
#  SETTINGS (Mini-CMS)
# ═══════════════════════════════════════════

@app.get("/api/settings")
def get_public_settings(db: Session = Depends(get_db)):
    """Public — retourne toutes les settings sous forme de dict clé→valeur."""
    settings = db.query(Setting).all()
    return {s.key: s.value for s in settings}


@app.get("/api/admin/settings", response_model=list[schemas.SettingOut])
def admin_get_settings(db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    """Admin — liste toutes les settings avec metadata."""
    return db.query(Setting).all()


@app.put("/api/admin/settings/{key}")
def admin_update_setting(key: str, body: schemas.SettingUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    """Admin — met à jour une setting."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(404, f"Setting '{key}' introuvable")
    setting.value = body.value
    db.commit()
    db.refresh(setting)
    return {"ok": True, "key": key, "value": setting.value}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
