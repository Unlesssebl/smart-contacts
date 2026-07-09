from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    internal_phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    department: Optional[str] = None
    office_location: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    email: Optional[str] = None
    ad_dn: Optional[str] = None

class UserRead(UserBase):
    id: UUID = Field(alias="object_guid")
    tg_id: Optional[int] = None
    manager_id: Optional[str] = None
    is_hidden: bool
    presence: str = "offline"
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class UserFull(UserRead):
    sam_account_name: str
    status: str
    role: str
    is_verified: bool
    is_protected: bool
    grace_period_left: int
    last_sync_timestamp: Optional[datetime] = None



class PaginatedUsers(BaseModel):
    total: int
    page: int
    limit: int
    items: List[UserRead]

class ProfileAcknowledge(BaseModel):
    action: str

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ["confirm", "skip"]:
            raise ValueError("Action must be 'confirm' or 'skip'")
        return v
