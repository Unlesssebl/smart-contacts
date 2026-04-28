from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import re

INTERNAL_PHONE_PATTERN = r"^\d{2}-\d{2}$"
MOBILE_PHONE_PATTERN = r"^\+7\d{10}$"

class ChangeRequestBase(BaseModel):
    attribute_name: str
    new_value: str

    @field_validator("attribute_name")
    @classmethod
    def validate_attribute_name(cls, v: str) -> str:
        allowed = ["internal_phone", "mobile_phone", "office_location"]
        if v not in allowed:
            raise ValueError(f"Attribute {v} is not allowed for change requests")
        return v

    @field_validator("new_value")
    @classmethod
    def validate_new_value(cls, v: str, info) -> str:
        attr = info.data.get("attribute_name")
        if attr == "internal_phone":
            if not re.match(INTERNAL_PHONE_PATTERN, v):
                raise ValueError("Internal phone must match pattern \d{2}-\d{2}")
        elif attr == "mobile_phone":
            if not re.match(MOBILE_PHONE_PATTERN, v):
                raise ValueError("Mobile phone must match pattern \+7\d{10}")
        return v

class ChangeRequestCreate(ChangeRequestBase):
    pass

class ChangeRequestRead(ChangeRequestBase):
    id: UUID
    user_id: UUID = Field(alias="user_guid")
    field_name: str = Field(alias="attribute_name")
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
