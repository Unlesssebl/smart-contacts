from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from shared.database import Base
import uuid
from shared.models.enums import ChangeRequestStatus

class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_guid = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="CASCADE"), nullable=False, index=True)
    attribute_name = Column(String(64), nullable=False)
    new_value = Column(Text, nullable=False)
    source = Column(String(10), nullable=False)
    status = Column(String(32), nullable=False, default=ChangeRequestStatus.PENDING.value, index=True)
    rejection_reason = Column(Text)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))

    user = relationship("User", foreign_keys=[user_guid], backref="change_requests")
    resolver = relationship("User", foreign_keys=[resolved_by])

    @property
    def user_name(self) -> str | None:
        return self.user.full_name if self.user else None
