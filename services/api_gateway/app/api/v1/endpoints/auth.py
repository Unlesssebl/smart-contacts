from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, Token, UserProfile
from app.services.auth_service import AuthService
from app.db.repository.user import get_user_by_guid
from app.core.spnego import validate_kerberos_ticket
from app.core.config import settings
import secrets
from jose import jwt
from datetime import datetime, timedelta, timezone

from app.api import deps

def set_auth_cookies(response: Response, tokens: Token):
    # CSRF token
    csrf_token = secrets.token_hex(32)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=getattr(settings, "COOKIE_SECURE", False),
        samesite="lax",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    # Access token
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=getattr(settings, "COOKIE_SECURE", False),
        samesite="lax",
        path="/",
        max_age=tokens.expires_in
    )
    # Refresh token
    if tokens.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=tokens.refresh_token,
            httponly=True,
            secure=getattr(settings, "COOKIE_SECURE", False),
            samesite="lax",
            path="/",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )

router = APIRouter()

@router.get("/sso", response_model=LoginResponse)
def login_sso(request: Request, response: Response, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    username = validate_kerberos_ticket(auth_header)
    
    if not username:
        # Не возвращаем WWW-Authenticate: Negotiate — иначе браузер показывает
        # системный попап с запросом пароля. Фронтенд получит 401 и сам
        # перенаправит пользователя на страницу авторизации.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kerberos authentication failed or not available"
        )
        
    auth_result = AuthService.login_sso(db, username)
    set_auth_cookies(response, auth_result.tokens)
    return LoginResponse(user=auth_result.user)

@router.post("/login", response_model=LoginResponse)
def login(request: Request, response: Response, data: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host
    auth_result = AuthService.login(db, data.username, data.password, client_ip)
    set_auth_cookies(response, auth_result.tokens)
    return LoginResponse(user=auth_result.user)

@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
    
    new_tokens = AuthService.refresh(db, refresh_token)
    set_auth_cookies(response, new_tokens)
    return {"detail": "Tokens refreshed"}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        from app.db.repository.token import revoke_refresh_token
        revoke_refresh_token(db, refresh_token)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("csrf_token", path="/")
    return {"detail": "Logged out"}

@router.get("/me", response_model=UserProfile)
def get_me(user_guid: str = Depends(deps.get_current_user_guid), db: Session = Depends(get_db)):
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
        last_sync_timestamp=user.last_sync_timestamp.isoformat() if user.last_sync_timestamp else None,
        avatar_color=user.avatar_color
    )

@router.get("/ws-token")
def get_ws_token(user_guid: str = Depends(deps.get_current_user_guid)):
    # Generate a short-lived token to be passed in the WebSocket URL query param
    # (Because WebSockets can't send HttpOnly cookies cross-origin)
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    to_encode = {"sub": str(user_guid), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {"ws_token": encoded_jwt}
