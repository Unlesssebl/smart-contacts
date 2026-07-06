from sqlalchemy.orm import Session
from app.models.change_request import ChangeRequest
from app.models.user import User
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.models.enums import ChangeRequestStatus

from sqlalchemy.orm import joinedload

def get_change_requests(db: Session) -> List[ChangeRequest]:
    return db.query(ChangeRequest).options(joinedload(ChangeRequest.user)).order_by(ChangeRequest.created_at.desc()).all()

def get_change_request(db: Session, request_id: UUID) -> Optional[ChangeRequest]:
    return db.query(ChangeRequest).filter(ChangeRequest.id == request_id).first()

def approve_request(db: Session, request_id: UUID, admin_guid: UUID) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    if req.status not in [ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None

    # Apply changes to user
    user = db.query(User).filter(User.object_guid == req.user_guid).first()
    if user:
        setattr(user, req.attribute_name, req.new_value)
        user.updated_at = datetime.utcnow()
    
    req.status = ChangeRequestStatus.APPROVED.value
    req.resolved_at = datetime.utcnow()
    req.resolved_by = admin_guid
    
    db.commit()
    db.refresh(req)
    return req

def reject_request(db: Session, request_id: UUID, admin_guid: UUID) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    if req.status not in [ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None
    
    req.status = ChangeRequestStatus.REJECTED.value
    req.resolved_at = datetime.utcnow()
    req.resolved_by = admin_guid
    
    db.commit()
    db.refresh(req)
    return req
