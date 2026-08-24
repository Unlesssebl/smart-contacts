from pydantic import BaseModel
from typing import Optional, List

class SecurityIncidentRead(BaseModel):
    ip: str
    attempts: int
    is_blocked: bool
    is_permanent: bool
    retry_after: int
    last_sam: Optional[str] = None
    last_attempt_at: Optional[str] = None

class SecurityUnblockRequest(BaseModel):
    ip: str

class SecurityBlockRequest(BaseModel):
    ip: str
    permanent: bool = True
    duration_seconds: Optional[int] = 3600
