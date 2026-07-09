from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ReportChangeItem(BaseModel):
    attribute_name: str
    new_value: str

class ReportCreateBulk(BaseModel):
    target_user_id: UUID
    changes: List[ReportChangeItem]

class ReportRead(BaseModel):
    id: UUID
    user_id: UUID = Field(alias="target_user_guid")
    target_user_name: Optional[str] = None
    reporter_user_guid: Optional[UUID] = None
    reporter_user_name: Optional[str] = None
    attribute_name: str
    new_value: str
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
