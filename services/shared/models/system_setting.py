from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from shared.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
