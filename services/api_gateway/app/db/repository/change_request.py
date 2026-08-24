from sqlalchemy.orm import Session
from shared.models.change_request import ChangeRequest
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from shared.models.enums import ChangeRequestStatus, UserStatus

from sqlalchemy.orm import joinedload

def get_change_requests(db: Session) -> List[ChangeRequest]:
    return db.query(ChangeRequest).options(joinedload(ChangeRequest.user)).order_by(ChangeRequest.created_at.desc()).all()

def get_change_request(db: Session, request_id: UUID) -> Optional[ChangeRequest]:
    return db.query(ChangeRequest).options(joinedload(ChangeRequest.user)).filter(ChangeRequest.id == request_id).first()

def approve_request(db: Session, request_id: UUID, admin_guid: UUID) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    if req.user and req.user.status == UserStatus.RESIGNED.value:
        return None

    if req.status not in [ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None

    req.status = ChangeRequestStatus.APPROVED.value
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = admin_guid
    req.rejection_reason = None

    # Auto-reject competing active change requests for the same user and attribute
    competing_crs = db.query(ChangeRequest).filter(
        ChangeRequest.user_guid == req.user_guid,
        ChangeRequest.attribute_name == req.attribute_name,
        ChangeRequest.id != req.id,
        ChangeRequest.status.in_([ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
    ).all()
    for c in competing_crs:
        c.status = ChangeRequestStatus.REJECTED.value
        c.rejection_reason = "Заменено другим одобренным изменением"
        c.resolved_by = admin_guid
        c.resolved_at = datetime.now(timezone.utc)

    # Auto-reject competing active reports for the same user and attribute
    from shared.models.report import Report
    from shared.models.enums import ReportStatus
    competing_reps = db.query(Report).filter(
        Report.target_user_guid == req.user_guid,
        Report.attribute_name == req.attribute_name,
        Report.status.in_([ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
    ).all()
    for r in competing_reps:
        r.status = "rejected"
        r.rejection_reason = "Заменено другим одобренным изменением"
        r.processed_by = admin_guid
        r.processed_at = datetime.now(timezone.utc)
    
    db.commit()
    return get_change_request(db, request_id)

def reject_request(db: Session, request_id: UUID, admin_guid: UUID, reason: Optional[str] = None) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    if req.status not in [ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None
    
    req.status = ChangeRequestStatus.REJECTED.value
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = admin_guid
    if reason:
        req.rejection_reason = reason
    
    db.commit()
    return get_change_request(db, request_id)

def update_request_value(db: Session, request_id: UUID, new_value: Optional[str]) -> Optional[ChangeRequest]:
    req = get_change_request(db, request_id)
    if not req:
        return None
    
    req.new_value = new_value
    if req.status == ChangeRequestStatus.CONFLICT.value:
        req.status = ChangeRequestStatus.PENDING.value
        req.rejection_reason = None

    db.commit()
    return get_change_request(db, request_id)
