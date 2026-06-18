"""SQLAlchemy models — 5 tables for single-provider booking system."""
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, Time, DateTime,
    ForeignKey, Enum, Text, CheckConstraint, func, Index
)
from sqlalchemy.orm import relationship
from database import Base
import enum


# WHY String enum: status values are human-readable in DB and API.
# 'pending' exists for future double-confirmation flow but is
# excluded from conflict checks (only confirmed+pending block slots).
class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show = "no_show"


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    price = Column(Integer, default=0)  # en dinars algériens (DA)
    color = Column(String(7), default="#b8860b")
    icon = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.utc_timestamp())

    appointments = relationship("Appointment", back_populates="service")

    __table_args__ = (
        Index("ix_services_active", "is_active"),
    )


class Availability(Base):
    """Disponibilités récurrentes par jour de la semaine."""
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    day_of_week = Column(Integer, nullable=False)  # 0=lundi, 6=dimanche
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)

    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_day_of_week"),
        Index("ix_availabilities_dow", "day_of_week"),
        Index("ix_availabilities_dow_valid", "day_of_week", "valid_from", "valid_until"),
    )


class ScheduleOverride(Base):
    """Exceptions de dates — modifie ou annule la dispo d'un jour précis."""
    __tablename__ = "schedule_overrides"

    id = Column(Integer, primary_key=True, autoincrement=True)
    override_date = Column(Date, nullable=False, unique=True)
    start_time = Column(Time, nullable=True)   # null = jour entier
    end_time = Column(Time, nullable=True)
    is_available = Column(Boolean, default=True)
    reason = Column(String(200), nullable=True)


class BlockedSlot(Base):
    """Créneaux ponctuellement bloqués."""
    __tablename__ = "blocked_slots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    reason = Column(String(200), nullable=True)

    __table_args__ = (
        Index("ix_blocked_slots_start", "start_time"),
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="SET NULL"), nullable=True)
    service_name = Column(String(100), nullable=True)  # preserved if service deleted
    client_name = Column(String(100), nullable=False)
    client_phone = Column(String(20), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.confirmed)
    booking_ref = Column(String(20), nullable=True, unique=True)
    sort_order = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.utc_timestamp())
    updated_at = Column(DateTime(timezone=True), server_default=func.utc_timestamp(), onupdate=func.utc_timestamp())

    service = relationship("Service", back_populates="appointments")

    __table_args__ = (
        Index("ix_appointments_start", "start_time"),
        Index("ix_appointments_status", "status"),
        Index("ix_appointments_phone", "client_phone"),
        Index("ix_appointments_service_id", "service_id"),
        Index("ix_appointments_start_status", "start_time", "status"),
    )


class Setting(Base):
    """Configuration du salon — éditable depuis le panel admin."""
    __tablename__ = "settings"

    key = Column(String(50), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.utc_timestamp(), onupdate=func.utc_timestamp())
