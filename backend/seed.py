"""Seed the database with Salon Karim demo data."""
import sys
sys.path.insert(0, ".")

from database import init_db, SessionLocal
from models import Service, Availability, ScheduleOverride, BlockedSlot
from datetime import time, date, datetime


def seed():
    init_db()
    db = SessionLocal()

    # ── Services ──
    if db.query(Service).count() == 0:
        db.add_all([
            Service(name="Coupe Homme", duration_minutes=30, price=1500, color="#b8860b"),
            Service(name="Coloration", duration_minutes=60, price=4500, color="#7c3aed"),
            Service(name="Brushing", duration_minutes=45, price=2500, color="#db2777"),
        ])

    # ── Availabilities ──
    if db.query(Availability).count() == 0:
        db.add_all([
            Availability(day_of_week=0, start_time=time(9, 0), end_time=time(12, 0)),
            Availability(day_of_week=0, start_time=time(14, 0), end_time=time(17, 0)),
            Availability(day_of_week=1, start_time=time(9, 0), end_time=time(12, 0)),
            Availability(day_of_week=1, start_time=time(14, 0), end_time=time(17, 0)),
            Availability(day_of_week=2, start_time=time(9, 0), end_time=time(12, 0)),
            Availability(day_of_week=3, start_time=time(9, 0), end_time=time(12, 0)),
            Availability(day_of_week=3, start_time=time(14, 0), end_time=time(17, 0)),
            Availability(day_of_week=4, start_time=time(14, 0), end_time=time(17, 0)),
        ])

    # ── Exceptions ──
    if db.query(ScheduleOverride).count() == 0:
        db.add(ScheduleOverride(
            override_date=date(2026, 6, 19),
            is_available=False,
            reason="Jour férié",
        ))

    # ── Blocked slots ──
    if db.query(BlockedSlot).count() == 0:
        db.add(BlockedSlot(
            start_time=datetime(2026, 6, 17, 15, 30),
            end_time=datetime(2026, 6, 17, 16, 0),
            reason="Rendez-vous personnel",
        ))

    db.commit()
    db.close()
    print("✅ Base de données initialisée avec les données de démo")


if __name__ == "__main__":
    seed()
