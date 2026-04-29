from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, Token, UserProfile
from app.services.auth_service import AuthService
from app.db.repository.user import get_user_by_guid

from app.api import deps

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host
    return AuthService.login(db, data.username, data.password, client_ip)

@router.post("/refresh", response_model=Token)
async def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    return AuthService.refresh(db, data.refresh_token)

@router.get("/me", response_model=UserProfile)
async def get_me(user_guid: str = Depends(deps.get_current_user_guid), db: Session = Depends(get_db)):
    user = get_user_by_guid(db, user_guid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        id=user.object_guid,
        sam_account_name=user.sam_account_name,
        full_name=user.full_name,
        internal_phone=user.internal_phone,
        mobile_phone=user.mobile_phone,
        department=user.department,
        office_location=user.office_location,
        role=user.role,
        is_verified=user.is_verified,
        is_protected=user.is_protected,
        grace_period_left=user.grace_period_left,
        last_sync_timestamp=user.last_sync_timestamp.isoformat() if user.last_sync_timestamp else None
    )
