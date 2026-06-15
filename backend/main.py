"""FastAPI application — booking system backend."""
from datetime import datetime, date, time, timedelta
from io import BytesIO
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import os, uuid, time as _time

from database import get_db, init_db
from models import (
    Service, Availability, ScheduleOverride, BlockedSlot,
    Appointment, AppointmentStatus,
)
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

import schemas

app = FastAPI(title="Salon Karim — Réservation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════
#  ADMIN AUTH — Token-based password protection
# ═══════════════════════════════════════════

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "salon2026")
_admin_tokens: dict[str, float] = {}  # token → expiry timestamp
TOKEN_TTL = 3600 * 8  # 8 hours

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

@app.post("/api/admin/login")
def admin_login(data: dict):
    """Authenticate with admin password, return a session token."""
    pwd = data.get("password", "")
    if pwd != ADMIN_PASSWORD:
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

def get_available_slots(
    db: Session,
    target_date: date,
    service_id: int,
) -> list[dict]:
    """
    Calculate all available slots for a given date and service.

    Priority:
    1. Schedule overrides (exceptions de date)
    2. Recurring availabilities
    3. Subtract blocked slots
    4. Subtract existing appointments
    5. Slice into slots based on service duration
    """
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service or not service.is_active:
        return []

    duration = service.duration_minutes
    dow = target_date.weekday()  # 0=lundi

    # ── Step 1+2: Get base availability ──
    override = db.query(ScheduleOverride).filter(
        ScheduleOverride.override_date == target_date
    ).first()

    ranges = []  # list of (start_time, end_time)

    if override and not override.is_available:
        return []  # journée entière indisponible

    if override and override.is_available and override.start_time and override.end_time:
        ranges = [(override.start_time, override.end_time)]
    elif override and override.is_available and not override.start_time:
        # Day is available, no time specified — fall through to recurring
        pass

    if not ranges:
        # Use recurring availabilities
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

        ranges = [(a.start_time, a.end_time) for a in avails]

    # ── Step 3: Subtract blocked slots ──
    day_start = datetime.combine(target_date, time.min)
    day_end = datetime.combine(target_date, time.max)

    blocked = db.query(BlockedSlot).filter(
        BlockedSlot.start_time < day_end,
        BlockedSlot.end_time > day_start,
    ).all()

    for block in blocked:
        bs = max(block.start_time, day_start).time()
        be = min(block.end_time, day_end).time()
        if be <= time.min:
            be = time(23, 59)

        new_ranges = []
        for s, e in ranges:
            if be <= s or bs >= e:
                new_ranges.append((s, e))
            else:
                if s < bs:
                    new_ranges.append((s, bs))
                if be < e:
                    new_ranges.append((be, e))
        ranges = new_ranges

    # ── Step 4: Subtract existing appointments ──
    appointments = db.query(Appointment).filter(
        Appointment.start_time < day_end,
        Appointment.end_time > day_start,
        Appointment.status.in_([
            AppointmentStatus.confirmed,
            AppointmentStatus.pending,
        ]),
    ).all()

    for apt in appointments:
        a_start = max(apt.start_time, day_start).time()
        a_end = min(apt.end_time, day_end).time()
        if a_end <= time.min:
            a_end = time(23, 59)

        new_ranges = []
        for s, e in ranges:
            if a_end <= s or a_start >= e:
                new_ranges.append((s, e))
            else:
                if s < a_start:
                    new_ranges.append((s, a_start))
                if a_end < e:
                    new_ranges.append((a_end, e))
        ranges = new_ranges

    # ── Step 5: Slice into slots ──
    slots = []
    for s, e in ranges:
        current_h = s.hour
        current_m = s.minute
        end_minutes = e.hour * 60 + e.minute

        while True:
            start_minutes = current_h * 60 + current_m
            if start_minutes + duration > end_minutes:
                break

            slot_start = f"{current_h:02d}:{current_m:02d}"
            end_m = start_minutes + duration
            slot_end = f"{end_m // 60:02d}:{end_m % 60:02d}"

            slots.append({
                "start": f"{target_date.isoformat()}T{slot_start}",
                "end": f"{target_date.isoformat()}T{slot_end}",
            })

            current_m += duration
            while current_m >= 60:
                current_h += 1
                current_m -= 60

    return slots


# ═══════════════════════════════════════════
#  PDF GENERATION
# ═══════════════════════════════════════════

def generate_confirmation_pdf(appointment: Appointment) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A5, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=18, alignment=TA_CENTER, spaceAfter=6*mm)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=11, alignment=TA_CENTER, textColor=colors.HexColor("#666"))
    label_style = ParagraphStyle("Label", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#888"))
    value_style = ParagraphStyle("Value", parent=styles["Normal"], fontSize=11, alignment=TA_LEFT)
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor("#999"))

    service = appointment.service
    date_str = appointment.start_time.strftime("%d/%m/%Y")
    time_str = appointment.start_time.strftime("%H:%M")
    end_str = appointment.end_time.strftime("%H:%M")

    data = [
        ["Service", f"{service.name} ({service.duration_minutes} min)"],
        ["Date", date_str],
        ["Heure", f"{time_str} – {end_str}"],
        ["Client", appointment.client_name],
        ["Téléphone", appointment.client_phone],
        ["Prix", f"{service.price:,} DA".replace(",", " ")],
        ["Adresse", "12 Rue Didouche, Alger Centre"],
    ]

    table = Table(data, colWidths=[60*mm, 80*mm])
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#888")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#eee")),
        ("ALIGN", (1, 0), (1, -1), "LEFT"),
    ]))

    elements = [
        Paragraph("Rendez-vous confirmé ✅", title_style),
        Paragraph("Salon Karim — Coiffure & Soins", subtitle_style),
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
    """Provider view — all services including inactive."""
    return db.query(Service).all()


@app.post("/api/services", response_model=schemas.ServiceOut)
def create_service(data: schemas.ServiceCreate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    srv = Service(**data.model_dump())
    db.add(srv)
    db.commit()
    db.refresh(srv)
    return srv


@app.put("/api/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(service_id: int, data: schemas.ServiceUpdate, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(404, "Service introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(srv, k, v)
    db.commit()
    db.refresh(srv)
    return srv


@app.delete("/api/services/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    srv = db.query(Service).filter(Service.id == service_id).first()
    if not srv:
        raise HTTPException(404, "Service introuvable")
    srv.is_active = False
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
    av = db.query(Availability).filter(Availability.id == avail_id).first()
    if not av:
        raise HTTPException(404, "Plage introuvable")
    db.delete(av)
    db.commit()
    return {"ok": True}


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
    ov = db.query(ScheduleOverride).filter(ScheduleOverride.id == override_id).first()
    if not ov:
        raise HTTPException(404, "Exception introuvable")
    db.delete(ov)
    db.commit()
    return {"ok": True}


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
    bs = db.query(BlockedSlot).filter(BlockedSlot.id == slot_id).first()
    if not bs:
        raise HTTPException(404, "Créneau bloqué introuvable")
    db.delete(bs)
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════
#  ROUTES — Slots (disponibilité côté client)
# ═══════════════════════════════════════════

@app.get("/api/slots", response_model=list[schemas.SlotOut])
def get_slots(
    target_date: str = Query(description="YYYY-MM-DD", alias="date"),
    service_id: int = Query(),
    db: Session = Depends(get_db),
):
    target = date.fromisoformat(target_date)
    slots = get_available_slots(db, target, service_id)
    return slots


@app.get("/api/slots/week", response_model=list[schemas.DaySlots])
def get_week_slots(
    start_date: str = Query(description="YYYY-MM-DD"),
    service_id: int = Query(),
    db: Session = Depends(get_db),
):
    start = date.fromisoformat(start_date)
    result = []
    for i in range(7):
        d = start + timedelta(days=i)
        slots = get_available_slots(db, d, service_id)
        result.append({
            "date": d.isoformat(),
            "slots": slots,
        })
    return result


# ═══════════════════════════════════════════
#  ROUTES — Appointments
# ═══════════════════════════════════════════

@app.post("/api/appointments", response_model=schemas.AppointmentOut)
def create_appointment(data: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service or not service.is_active:
        raise HTTPException(400, "Service invalide ou inactif")

    start = data.start_time
    end = start + timedelta(minutes=service.duration_minutes)

    # Check overlap
    conflict = db.query(Appointment).filter(
        Appointment.start_time < end,
        Appointment.end_time > start,
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.pending]),
    ).first()

    if conflict:
        raise HTTPException(409, "Ce créneau n'est plus disponible")

    # Check not blocked
    blocked = db.query(BlockedSlot).filter(
        BlockedSlot.start_time < end,
        BlockedSlot.end_time > start,
    ).first()

    if blocked:
        raise HTTPException(409, "Ce créneau est bloqué")

    # Check availability
    target_date = start.date()
    slots = get_available_slots(db, target_date, data.service_id)
    slot_keys = {(s["start"], s["end"]) for s in slots}
    # Normalize: slots return "HH:MM" without seconds, appointment has full ISO
    slot_key = (start.strftime("%Y-%m-%dT%H:%M"), end.strftime("%Y-%m-%dT%H:%M"))

    if slot_key not in slot_keys:
        raise HTTPException(409, "Ce créneau n'est pas disponible")

    apt = Appointment(
        service_id=data.service_id,
        client_name=data.client_name,
        client_phone=data.client_phone,
        start_time=start,
        end_time=end,
        status=AppointmentStatus.confirmed,
    )
    db.add(apt)
    db.commit()
    db.refresh(apt)

    # Enrich response
    out = schemas.AppointmentOut.model_validate(apt)
    out.service_name = service.name
    out.service_duration = service.duration_minutes
    out.service_price = service.price
    return out


@app.get("/api/appointments", response_model=list[schemas.AppointmentOut])
def list_appointments(
    target_date: Optional[str] = Query(default=None, alias="date"),
    phone: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(Appointment)

    if target_date:
        d = date.fromisoformat(target_date)
        day_start = datetime.combine(d, time.min)
        day_end = datetime.combine(d, time.max)
        q = q.filter(Appointment.start_time >= day_start, Appointment.start_time <= day_end)

    if phone:
        q = q.filter(Appointment.client_phone == phone.strip())

    if status:
        q = q.filter(Appointment.status == status)

    appointments = q.order_by(Appointment.start_time).all()
    result = []
    for apt in appointments:
        out = schemas.AppointmentOut.model_validate(apt)
        if apt.service:
            out.service_name = apt.service.name
            out.service_duration = apt.service.duration_minutes
            out.service_price = apt.service.price
        result.append(out)
    return result


@app.get("/api/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")
    out = schemas.AppointmentOut.model_validate(apt)
    if apt.service:
        out.service_name = apt.service.name
        out.service_duration = apt.service.duration_minutes
        out.service_price = apt.service.price
    return out


@app.put("/api/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    data: schemas.AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_token),
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")
    apt.status = AppointmentStatus(data.status)
    db.commit()
    return {"ok": True}


@app.get("/api/appointments/{appointment_id}/pdf")
def download_appointment_pdf(appointment_id: int, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(404, "Rendez-vous introuvable")

    buffer = generate_confirmation_pdf(apt)
    filename = f"rdv_{apt.client_phone}_{apt.start_time.strftime('%Y%m%d_%H%M')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════
#  ROUTES — Analytics & Stats
# ═══════════════════════════════════════════

@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db), token: str = Depends(verify_admin_token)):
    """Dashboard analytics: revenue, appointments, top services, trends."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total appointments (non-cancelled)
    total_apts = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.cancelled
    ).count()

    # This month appointments
    month_apts = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.cancelled,
        Appointment.start_time >= month_start
    ).count()

    # Revenue: sum service prices for confirmed/completed appointments
    total_revenue = db.query(
        func.coalesce(func.sum(Service.price), 0)
    ).select_from(Appointment).join(Service, Appointment.service_id == Service.id).filter(
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed])
    ).scalar() or 0

    month_revenue = db.query(
        func.coalesce(func.sum(Service.price), 0)
    ).select_from(Appointment).join(Service, Appointment.service_id == Service.id).filter(
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed]),
        Appointment.start_time >= month_start
    ).scalar() or 0

    # Appointments per day (last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    daily = db.query(
        func.date(Appointment.start_time).label("day"),
        func.count(Appointment.id).label("count")
    ).filter(
        Appointment.status != AppointmentStatus.cancelled,
        Appointment.start_time >= thirty_days_ago
    ).group_by(func.date(Appointment.start_time)).order_by("day").all()

    appointments_per_day = [
        {"date": str(d.day), "count": d.count} for d in daily
    ]

    # Top services
    top_services = db.query(
        Service.name,
        func.count(Appointment.id).label("count"),
        func.coalesce(func.sum(Service.price), 0).label("revenue")
    ).select_from(Appointment).join(Service, Appointment.service_id == Service.id).filter(
        Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed])
    ).group_by(Service.name).order_by(func.count(Appointment.id).desc()).limit(5).all()

    top = [
        {"name": s.name, "count": s.count, "revenue": s.revenue}
        for s in top_services
    ]

    # Unique clients
    unique_clients = db.query(func.count(func.distinct(Appointment.client_phone))).filter(
        Appointment.status != AppointmentStatus.cancelled
    ).scalar() or 0

    # Status breakdown
    status_counts = db.query(
        Appointment.status,
        func.count(Appointment.id)
    ).group_by(Appointment.status).all()

    status_breakdown = {
        s.status.value: s[1] for s in status_counts
    }

    # Completion rate
    completed = sum(1 for s in status_counts if s.status == AppointmentStatus.completed)
    completion_rate = round(completed / max(total_apts, 1) * 100)

    return {
        "total_appointments": total_apts,
        "month_appointments": month_apts,
        "total_revenue": total_revenue,
        "month_revenue": month_revenue,
        "appointments_per_day": appointments_per_day,
        "top_services": top,
        "unique_clients": unique_clients,
        "status_breakdown": status_breakdown,
        "completion_rate": completion_rate,
    }


# ═══════════════════════════════════════════
#  STARTUP
# ═══════════════════════════════════════════

@app.on_event("startup")
def on_startup():
    init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
