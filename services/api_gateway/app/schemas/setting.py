from pydantic import BaseModel
from typing import Optional

class LDAPSettingsUpdate(BaseModel):
    ad_user: Optional[str] = None
    ad_password: Optional[str] = None

class LDAPSettingsRead(BaseModel):
    ad_user: Optional[str] = None
    is_password_set: bool

class OuMappingUpdate(BaseModel):
    mapping: dict[str, str]
