from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class ReportCreate(BaseModel):
    target_user_id: UUID
    reason: str

class ReportRead(BaseModel):
    id: UUID
    target_user_guid: UUID
    reporter_user_guid: Optional[UUID] = None
    reason: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
