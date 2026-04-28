from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Integer,
    BigInteger,
    ForeignKey,
    Text,
    create_engine,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    object_guid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    sam_account_name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE")
    tg_id: Mapped[Optional[int]] = mapped_column(BigInteger, unique=True)
    full_name: Mapped[str] = mapped_column(String(256), nullable=False)
    internal_phone: Mapped[Optional[str]] = mapped_column(String(20))
    mobile_phone: Mapped[Optional[str]] = mapped_column(String(20))
    department: Mapped[Optional[str]] = mapped_column(String(256))
    office_location: Mapped[Optional[str]] = mapped_column(String(256))
    organization: Mapped[Optional[str]] = mapped_column(String(256))
    job_title: Mapped[Optional[str]] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(32), default="employee")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_protected: Mapped[bool] = mapped_column(Boolean, default=False)
    grace_period_left: Mapped[int] = mapped_column(Integer, default=3)
    last_sync_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sync_error_log: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.now, onupdate=datetime.now
    )


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_guid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="CASCADE"), nullable=False
    )
    attribute_name: Mapped[str] = mapped_column(String(64), nullable=False)
    new_value: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
