"""Pydantic schemas for request/response validation."""
from datetime import datetime, date, time
from pydantic import BaseModel, Field
from typing import Optional


# ─── Service ───

class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    duration_minutes: int = Field(gt=0, le=480)
    price: int = Field(default=0, ge=0)
    color: str = Field(default="#b8860b", max_length=7)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(default=None, gt=0, le=480)
    price: Optional[int] = Field(default=None, ge=0)
    color: Optional[str] = Field(default=None, max_length=7)
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: int
    name: str
    duration_minutes: int
    price: int
    color: str
    is_active: bool

    model_config = {"from_attributes": True}


# ─── Availability ───

class AvailabilityCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")  # "09:00"
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class AvailabilityOut(BaseModel):
    id: int
    day_of_week: int
    start_time: str
    end_time: str
    valid_from: Optional[date]
    valid_until: Optional[date]

    model_config = {"from_attributes": True}


# ─── Schedule Override ───

class OverrideCreate(BaseModel):
    override_date: date
    start_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    is_available: bool = True
    reason: Optional[str] = None


class OverrideOut(BaseModel):
    id: int
    override_date: date
    start_time: Optional[str]
    end_time: Optional[str]
    is_available: bool
    reason: Optional[str]

    model_config = {"from_attributes": True}


# ─── Blocked Slot ───

class BlockedSlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None


class BlockedSlotOut(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    reason: Optional[str]

    model_config = {"from_attributes": True}


# ─── Appointment ───

class AppointmentCreate(BaseModel):
    service_id: int
    client_name: str = Field(min_length=2, max_length=100)
    client_phone: str = Field(min_length=6, max_length=20)
    start_time: datetime


class AppointmentOut(BaseModel):
    id: int
    service_id: int
    client_name: str
    client_phone: str
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str]
    service_name: Optional[str] = None
    service_duration: Optional[int] = None
    service_price: Optional[int] = None

    model_config = {"from_attributes": True}


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(confirmed|cancelled|completed|no_show)$")


class AppointmentLookup(BaseModel):
    client_phone: str = Field(min_length=6, max_length=20)


# ─── Slot / Calendar ───

class SlotOut(BaseModel):
    start: str   # "2026-06-16T09:00"
    end: str


class DaySlots(BaseModel):
    date: str
    slots: list[SlotOut]
