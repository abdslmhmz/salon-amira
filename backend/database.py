"""
Database configuration.
- Reads DATABASE_URL from env for MySQL in Docker.
- Falls back to SQLite for local dev.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./booking.db")

# SQLite needs check_same_thread=False
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False, pool_pre_ping=True)

# WHY autoflush=False: All writes must be explicit via commit().
# Prevents accidental partial writes and makes transaction
# boundaries visible in the code. Safer for booking integrity.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
