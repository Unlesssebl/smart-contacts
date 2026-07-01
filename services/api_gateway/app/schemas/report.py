from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class ReportCreate(BaseModel):
    target_user_id: UUID
    reason: str

class ReportRead(BaseModel):
    id: UUID
    user_id: UUID = Field(alias="target_user_guid")
    target_user_name: Optional[str] = None
    reporter_user_guid: Optional[UUID] = None
    reporter_user_name: Optional[str] = None
    description: str = Field(alias="reason")
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
