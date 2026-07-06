from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from shared.models.change_request import ChangeRequest
from shared.models.enums import ChangeRequestStatus
from app.schemas.user import ProfileAcknowledge
from app.schemas.change_request import ChangeRequestCreate, ChangeRequestRead
from typing import List

router = APIRouter()

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    pending_changes = db.query(ChangeRequest).filter(
        ChangeRequest.user_guid == current_user.object_guid,
        ChangeRequest.status.in_([ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
    ).all()
    
    return {
        "profile": current_user,
        "pending_changes": pending_changes
    }

@router.get("/me/change-requests", response_model=List[ChangeRequestRead])
def get_my_change_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return db.query(ChangeRequest).filter(
        ChangeRequest.user_guid == current_user.object_guid
    ).order_by(ChangeRequest.created_at.desc()).all()

@router.post("/me/acknowledge")
def acknowledge_gatekeeper(
    data: ProfileAcknowledge,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Используем SELECT FOR UPDATE для атомарности
    user = db.query(User).filter(User.object_guid == current_user.object_guid).with_for_update().first()
    
    if data.action == "confirm":
        if user.is_verified:
            raise HTTPException(status_code=409, detail="Already verified")
        user.is_verified = True
    
    elif data.action == "skip":
        if user.is_verified:
             raise HTTPException(status_code=409, detail="Already verified")
        if user.grace_period_left <= 0:
            raise HTTPException(status_code=409, detail="No skips remaining")
        user.grace_period_left -= 1
    
    db.commit()
    db.refresh(user)
    
    return {
        "is_verified": user.is_verified,
        "grace_period_left": user.grace_period_left
    }

@router.post("/me/change-request", status_code=201, response_model=ChangeRequestRead)
def create_change_request(
    data: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Проверка на наличие активной заявки на это же поле
    existing = db.query(ChangeRequest).filter(
        ChangeRequest.user_guid == current_user.object_guid,
        ChangeRequest.attribute_name == data.attribute_name,
        ChangeRequest.status.in_([ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail=f"Active request for {data.attribute_name} already exists")
    
    # Авто-верификация при создании заявки
    if not current_user.is_verified:
        current_user.is_verified = True
    
    new_request = ChangeRequest(
        user_guid=current_user.object_guid,
        attribute_name=data.attribute_name,
        new_value=data.new_value,
        source="web",
        status=ChangeRequestStatus.PENDING.value
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return new_request
