"""SQLAlchemy models — 5 tables for single-provider booking system."""
from datetime import time, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, Time, DateTime,
    ForeignKey, Enum, Text, CheckConstraint, func
)
from sqlalchemy.orm import relationship
from database import Base
import enum


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
    price = Column(Integer, default=0)  # en centimes (1500 = 1500 DA)
    color = Column(String(7), default="#b8860b")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    appointments = relationship("Appointment", back_populates="service")


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
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    reason = Column(String(200), nullable=True)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    client_name = Column(String(100), nullable=False)
    client_phone = Column(String(20), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.confirmed)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    service = relationship("Service", back_populates="appointments")
