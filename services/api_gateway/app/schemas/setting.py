from pydantic import BaseModel
from typing import Optional, Any

class LDAPSettingsUpdate(BaseModel):
    ad_user: Optional[str] = None
    ad_password: Optional[str] = None

class LDAPSettingsRead(BaseModel):
    ad_user: Optional[str] = None
    is_password_set: bool
    status: Optional[str] = None
    last_error: Optional[str] = None

class OuMappingUpdate(BaseModel):
    mapping: dict[str, Any]

class CanonicalMappingUpdate(BaseModel):
    mapping: dict[str, str]

class CanonicalSuggestionCluster(BaseModel):
    suggested_canonical: str
    variants: list[str]

class CanonicalSuggestionsResponse(BaseModel):
    departments: list[CanonicalSuggestionCluster]
    job_titles: list[CanonicalSuggestionCluster]

