from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None

class UserAuthResponse(BaseModel):
    id: UUID
    sam_account_name: str
    full_name: str
    role: str
    is_verified: bool
    grace_period_left: int

class LoginResponse(BaseModel):
    user: UserAuthResponse

class AuthResult(BaseModel):
    user: UserAuthResponse
    tokens: Token

class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    id: UUID
    sam_account_name: str
    full_name: str
    internal_phone: Optional[str]
    mobile_phone: Optional[str]
    department: Optional[str]
    office_location: Optional[str]
    role: str
    is_verified: bool
    is_protected: bool
    grace_period_left: int
    last_sync_timestamp: Optional[str]
