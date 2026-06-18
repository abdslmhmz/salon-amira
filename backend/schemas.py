"""Pydantic schemas for request/response validation."""
from datetime import datetime, date, time
from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Optional


def _coerce_time(value):
    """Accept HH:MM string or time/datetime object, return HH:MM string or None."""
    if value is None:
        return None
    return value.strftime('%H:%M') if hasattr(value, 'strftime') else str(value)


# ─── Admin Login ───

class AdminLogin(BaseModel):
    password: str = Field(min_length=1)


# ─── Service ───

class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    duration_minutes: int = Field(gt=0, le=480)
    price: int = Field(default=0, ge=0)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(default=None, gt=0, le=480)
    price: Optional[int] = Field(default=None, ge=0)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: int
    name: str
    duration_minutes: int
    price: int
    description: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


# ─── Availability ───

class AvailabilityCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")  # "09:00"
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None

    @model_validator(mode="after")
    def check_end_after_start(self):
        if time.fromisoformat(self.start_time) >= time.fromisoformat(self.end_time):
            raise ValueError("end_time doit être après start_time")
        return self


class AvailabilityOut(BaseModel):
    id: int
    day_of_week: int
    start_time: str
    end_time: str
    valid_from: Optional[date]
    valid_until: Optional[date]

    model_config = {"from_attributes": True}

    @field_validator('start_time', 'end_time', mode='before')
    @classmethod
    def coerce_time(cls, v):
        return _coerce_time(v)


class AvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    start_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


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

    @field_validator('start_time', 'end_time', mode='before')
    @classmethod
    def coerce_time(cls, v):
        return _coerce_time(v)


class OverrideUpdate(BaseModel):
    start_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    is_available: Optional[bool] = None
    reason: Optional[str] = None


# ─── Blocked Slot ───

class BlockedSlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None

    @model_validator(mode="after")
    def check_end_after_start(self):
        if self.start_time >= self.end_time:
            raise ValueError("end_time doit être après start_time")
        return self


class BlockedSlotOut(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    reason: Optional[str]

    model_config = {"from_attributes": True}


class BlockedSlotUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    reason: Optional[str] = None

    @model_validator(mode="after")
    def check_end_after_start(self):
        if self.start_time is not None and self.end_time is not None and self.start_time >= self.end_time:
            raise ValueError("end_time doit être après start_time")
        return self


# ─── Appointment ───

class AppointmentCreate(BaseModel):
    service_id: Optional[int] = None  # backward compat (single service)
    service_ids: Optional[list[int]] = None  # multi-service
    client_name: str = Field(min_length=2, max_length=100, pattern=r"^[^<>]{2,100}$")
    client_phone: str = Field(min_length=6, max_length=20, pattern=r"^\+?[0-9\s\-]{8,15}$")
    start_time: datetime

    @model_validator(mode="after")
    def check_at_least_one_service(self):
        if not self.service_id and not self.service_ids:
            raise ValueError("service_id (single) ou service_ids (multiple) requis")
        return self


class AppointmentOut(BaseModel):
    id: int
    service_id: Optional[int] = None  # null if service was deleted
    service_name: Optional[str] = None  # preserved on delete
    client_name: str
    client_phone: str
    start_time: datetime
    end_time: datetime
    status: str
    booking_ref: Optional[str] = None
    sort_order: int = 1
    notes: Optional[str]
    service_duration: Optional[int] = None
    service_price: Optional[int] = None

    model_config = {"from_attributes": True}


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(confirmed|cancelled|completed|no_show)$")


class AppointmentUpdate(BaseModel):
    client_name: Optional[str] = Field(default=None, min_length=2, max_length=100, pattern=r"^[^<>]{2,100}$")
    client_phone: Optional[str] = Field(default=None, min_length=6, max_length=20, pattern=r"^\+?[0-9\s\-]{8,15}$")
    start_time: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


# ─── Slot / Calendar ───

class SlotOut(BaseModel):
    start: str   # "2026-06-16T09:00"
    end: str
    segments: list[dict] = []  # plages réelles (ex: [{start:"09:00",end:"12:00"},{start:"14:00",end:"14:30"}])
    has_break: bool = False    # true si le bloc chevauche la pause déjeuner


class DaySlots(BaseModel):
    date: str
    slots: list[SlotOut]


# ─── Settings ───

class SettingOut(BaseModel):
    key: str
    value: str
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str = Field(min_length=0, max_length=2000)
