import uuid
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from shared.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_guid = Column(
        UUID(as_uuid=True),
        ForeignKey("users.object_guid", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True
    )
    type = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    body = Column(Text, nullable=False)
    field = Column(String(64), nullable=True)
    category = Column(String(64), nullable=True)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, default=dict)

    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_guid], backref="notifications")
