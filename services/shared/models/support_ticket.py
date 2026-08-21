from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from shared.database import Base
import uuid
from shared.models.enums import SupportTicketStatus

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_guid = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="SET NULL"), nullable=True, index=True)
    sender_name = Column(String(256), nullable=True)
    sender_contact = Column(String(256), nullable=True)
    category = Column(String(64), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default=SupportTicketStatus.OPEN.value, index=True)
    closed_by = Column(UUID(as_uuid=True), ForeignKey("users.object_guid", ondelete="SET NULL"), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_guid], backref="support_tickets")
    closer = relationship("User", foreign_keys=[closed_by])

    @property
    def display_sender_name(self) -> str:
        if self.user and self.user.full_name:
            return self.user.full_name
        return self.sender_name or "Аноним"

    @property
    def display_sender_contact(self) -> str:
        if self.user:
            contacts = []
            if self.user.email:
                contacts.append(self.user.email)
            if self.user.internal_phone:
                contacts.append(f"вн. {self.user.internal_phone}")
            if self.user.mobile_phone:
                contacts.append(self.user.mobile_phone)
            if contacts:
                return ", ".join(contacts)
            return self.user.sam_account_name
        return self.sender_contact or "Не указано"

    @property
    def closer_name(self) -> str | None:
        return self.closer.full_name if self.closer else None
