from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.db.session import get_db
from shared.models.user import User
from app.schemas.user import UserVisibilityUpdate
from app.core import settings_manager

router = APIRouter()

@router.post("/sync/force")
def force_sync(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    """Signals the AD sync worker to perform an immediate sync cycle."""
    settings_manager.set_setting(db, "FORCE_SYNC", "1")
    return {"status": "ok", "message": "Sync requested"}

@router.patch("/users/{user_id}/visibility")
def update_user_visibility(
    user_id: UUID,
    data: UserVisibilityUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    user = db.query(User).filter(User.object_guid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_hidden = data.is_hidden
    db.commit()
    
    return {"status": "ok", "is_hidden": user.is_hidden}
