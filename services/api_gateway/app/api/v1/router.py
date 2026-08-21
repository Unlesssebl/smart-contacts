from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, profile, reports, admin, ws, support

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(support.router, prefix="/support", tags=["support"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
