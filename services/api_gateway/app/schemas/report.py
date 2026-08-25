from pydantic import BaseModel, ConfigDict, computed_field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.schemas.change_request import sanitize_and_validate_value

class ReportChangeItem(BaseModel):
    attribute_name: str
    new_value: Optional[str] = None

    @field_validator("attribute_name")
    @classmethod
    def validate_attribute_name(cls, v: str) -> str:
        allowed = [
            "internal_phone", "mobile_phone", "office_location",
            "department", "full_name", "job_title"
        ]
        if v not in allowed:
            raise ValueError(f"Attribute {v} is not allowed for reports")
        return v

    @field_validator("new_value")
    @classmethod
    def validate_new_value(cls, v: Optional[str], info) -> Optional[str]:
        attr = info.data.get("attribute_name")
        return sanitize_and_validate_value(attr, v)

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

    @field_validator("new_value")
    @classmethod
    def validate_new_value(cls, v: Optional[str]) -> Optional[str]:
        if not v or v in ("<Удалить>", "[]"):
            return None
        import re
        v_clean = re.sub(r"[\r\n\t\x00-\x1f]", " ", str(v))
        v_clean = re.sub(r"\s+", " ", v_clean).strip()
        return v_clean or None
