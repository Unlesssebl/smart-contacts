from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class SupportTicketCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=64, description="Категория обращения")
    message: str = Field(..., min_length=3, max_length=5000, description="Текст сообщения")
    sender_name: Optional[str] = Field(None, max_length=256, description="ФИО заявителя (для гостей)")
    sender_contact: Optional[str] = Field(None, max_length=256, description="Контакт заявителя (для гостей)")

class SupportTicketRead(BaseModel):
    id: UUID
    user_guid: Optional[UUID] = None
    sender_name: Optional[str] = None
    sender_contact: Optional[str] = None
    display_sender_name: str
    display_sender_contact: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_guest: bool = False
    category: str
    message: str
    status: str
    closed_by: Optional[UUID] = None
    closer_name: Optional[str] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
