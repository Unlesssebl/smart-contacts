from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from shared.database import Base
import uuid

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_user_guid = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="CASCADE"), nullable=False)
    reporter_user_guid = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="SET NULL"))
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="SET NULL"))

    target_user = relationship("User", foreign_keys=[target_user_guid], backref="reports_received")
    reporter = relationship("User", foreign_keys=[reporter_user_guid], backref="reports_made")
    processor = relationship("User", foreign_keys=[processed_by])

    @property
    def target_user_name(self) -> str | None:
        return self.target_user.full_name if self.target_user else None

    @property
    def reporter_user_name(self) -> str | None:
        return self.reporter.full_name if self.reporter else None
