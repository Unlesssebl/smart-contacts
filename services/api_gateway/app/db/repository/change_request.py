from sqlalchemy.orm import Session
from shared.models.change_request import ChangeRequest
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from shared.models.enums import ChangeRequestStatus

from sqlalchemy.orm import joinedload

def get_change_requests(db: Session) -> List[ChangeRequest]:
    return db.query(ChangeRequest).options(joinedload(ChangeRequest.user)).order_by(ChangeRequest.created_at.desc()).all()

def get_change_request(db: Session, request_id: UUID) -> Optional[ChangeRequest]:
    return db.query(ChangeRequest).options(joinedload(ChangeRequest.user)).filter(ChangeRequest.id == request_id).first()

def approve_request(db: Session, request_id: UUID, admin_guid: UUID) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    if req.status not in [ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None

    # Do not apply changes to user here.
    # The SyncWorker will push them to AD, and upon success, it will update the user locally
    # and set the ChangeRequest status to APPLIED.
    
    req.status = ChangeRequestStatus.APPROVED.value
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = admin_guid
    
    db.commit()
    # Возвращаем заново запрошенный объект, чтобы подтянуть связи
    return get_change_request(db, request_id)

def reject_request(db: Session, request_id: UUID, admin_guid: UUID) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    if req.status not in [ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None
    
    req.status = ChangeRequestStatus.REJECTED.value
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = admin_guid
    
    db.commit()
    # Возвращаем заново запрошенный объект, чтобы подтянуть связи
    return get_change_request(db, request_id)
