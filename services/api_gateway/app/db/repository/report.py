from sqlalchemy.orm import Session
from shared.models.report import Report
from shared.models.user import User
from shared.models.change_request import ChangeRequest
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from shared.models.enums import ChangeRequestStatus, ReportStatus, UserStatus

from sqlalchemy.orm import joinedload

def get_reports(db: Session) -> List[Report]:
    return db.query(Report).options(joinedload(Report.target_user), joinedload(Report.reporter)).order_by(Report.created_at.desc()).all()

def get_report(db: Session, report_id: UUID) -> Optional[Report]:
    return db.query(Report).options(joinedload(Report.target_user), joinedload(Report.reporter)).filter(Report.id == report_id).first()

def create_reports_bulk(db: Session, reporter_guid: UUID, target_guid: UUID, changes: list) -> List[Report]:
    new_reports = []
    for change in changes:
        # Check for duplicates on the specific attribute
        existing = db.query(Report).filter(
            Report.target_user_guid == target_guid,
            Report.reporter_user_guid == reporter_guid,
            Report.attribute_name == change.attribute_name,
            Report.status.in_([ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
        ).first()
        
        if not existing:
            rep = Report(
                target_user_guid=target_guid,
                reporter_user_guid=reporter_guid,
                attribute_name=change.attribute_name,
                new_value=change.new_value,
                status=ReportStatus.PENDING.value
            )
            db.add(rep)
            new_reports.append(rep)
            
    if new_reports:
        # Check if target user is protected before escalating
        target_user = db.query(User).filter(User.object_guid == target_guid).first()
        if target_user and not target_user.is_protected:
            # Escalate pending change requests to 'conflict'
            active_requests = db.query(ChangeRequest).filter(
                ChangeRequest.user_guid == target_guid,
                ChangeRequest.status == ChangeRequestStatus.PENDING.value
            ).all()
            
            for req in active_requests:
                req.status = ChangeRequestStatus.CONFLICT.value
                
        db.commit()
        for rep in new_reports:
            db.refresh(rep)
            
    return new_reports

def approve_report(db: Session, report_id: UUID, admin_guid: UUID) -> Optional[Report]:
    report = get_report(db, report_id)
    if not report:
        return None
    
    if report.target_user and report.target_user.status == UserStatus.RESIGNED.value:
        return None

    if report.status not in [ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None

    report.status = "approved"
    report.processed_at = datetime.utcnow()
    report.processed_by = admin_guid
    report.rejection_reason = None

    # Auto-reject competing active change requests for the same target user and attribute
    competing_crs = db.query(ChangeRequest).filter(
        ChangeRequest.user_guid == report.target_user_guid,
        ChangeRequest.attribute_name == report.attribute_name,
        ChangeRequest.status.in_([ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
    ).all()
    for c in competing_crs:
        c.status = ChangeRequestStatus.REJECTED.value
        c.rejection_reason = "Заменено другим одобренным изменением"
        c.resolved_by = admin_guid
        c.resolved_at = datetime.utcnow()

    # Auto-reject competing active reports for the same target user and attribute
    competing_reps = db.query(Report).filter(
        Report.target_user_guid == report.target_user_guid,
        Report.attribute_name == report.attribute_name,
        Report.id != report.id,
        Report.status.in_([ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value])
    ).all()
    for r in competing_reps:
        r.status = "rejected"
        r.rejection_reason = "Заменено другим одобренным изменением"
        r.processed_by = admin_guid
        r.processed_at = datetime.utcnow()
    
    db.commit()
    return get_report(db, report_id)

def reject_report(db: Session, report_id: UUID, admin_guid: UUID, reason: Optional[str] = None) -> Optional[Report]:
    report = get_report(db, report_id)
    if not report:
        return None
        
    if report.status not in [ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None
        
    report.status = "rejected"
    report.processed_at = datetime.utcnow()
    report.processed_by = admin_guid
    if reason:
        report.rejection_reason = reason
    
    db.commit()
    return get_report(db, report_id)

def update_report_value(db: Session, report_id: UUID, new_value: Optional[str]) -> Optional[Report]:
    report = get_report(db, report_id)
    if not report:
        return None
    
    report.new_value = new_value
    if report.status in ["conflict", ChangeRequestStatus.CONFLICT.value]:
        report.status = ReportStatus.PENDING.value
        report.rejection_reason = None

    db.commit()
    return get_report(db, report_id)
