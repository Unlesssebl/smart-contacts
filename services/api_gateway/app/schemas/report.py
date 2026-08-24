from pydantic import BaseModel, ConfigDict, computed_field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ReportChangeItem(BaseModel):
    attribute_name: str
    new_value: Optional[str] = None

class ReportCreateBulk(BaseModel):
    target_user_id: UUID
    changes: List[ReportChangeItem]

class ReportRead(BaseModel):
    id: UUID
    target_user_guid: UUID
    target_user_name: Optional[str] = None
    reporter_user_guid: Optional[UUID] = None
    reporter_user_name: Optional[str] = None
    attribute_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    is_protected: bool = False
    user_status: str = "active"
    created_at: datetime

    @computed_field
    @property
    def user_id(self) -> UUID:
        return self.target_user_guid

    @computed_field
    @property
    def field_name(self) -> str:
        return self.attribute_name

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ReportUpdateValue(BaseModel):
    new_value: Optional[str] = None
