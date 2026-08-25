from datetime import datetime
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    id: UUID
    user_guid: UUID
    type: str
    title: str
    body: str
    field: Optional[str] = None
    category: Optional[str] = None
    payload: Optional[dict[str, Any]] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationRead]
    unread_count: int
    total: int


class UnreadCountResponse(BaseModel):
    unread_count: int
