from fastapi import APIRouter
from .reviews import router as reviews_router
from .settings import router as settings_router
from .support import router as support_router
from .security import router as security_router
from .users import router as users_router

router = APIRouter()

router.include_router(reviews_router)
router.include_router(settings_router)
router.include_router(support_router)
router.include_router(security_router)
router.include_router(users_router)

# Re-export service helper for backward compatibility
from app.services.ou_service import apply_ou_mapping_to_users_bg

__all__ = ["router", "apply_ou_mapping_to_users_bg"]
