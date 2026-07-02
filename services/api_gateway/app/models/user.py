from sqlalchemy import Column, String, Boolean, SmallInteger, DateTime, BigInteger, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import uuid

class User(Base):
    __tablename__ = "users"

    object_guid = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sam_account_name = Column(String(64), unique=True, nullable=False)
    status = Column(String(16), nullable=False, default="ACTIVE")
    tg_id = Column(BigInteger, unique=True)
    full_name = Column(String(256), nullable=False)
    internal_phone = Column(String(100))
    mobile_phone = Column(String(100))
    department = Column(String(256))
    office_location = Column(String(256))
    organization = Column(String(256))
    ad_dn = Column(String(512))
    job_title = Column(String(256))
    role = Column(String(32), nullable=False, default="employee")
    is_verified = Column(Boolean, nullable=False, default=False)
    is_protected = Column(Boolean, nullable=False, default=False)
    grace_period_left = Column(SmallInteger, nullable=False, default=3)
    last_sync_timestamp = Column(DateTime(timezone=True))
    sync_error_log = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
