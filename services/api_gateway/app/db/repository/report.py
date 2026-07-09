from sqlalchemy.orm import Session
from shared.models.report import Report
from shared.models.user import User
from shared.models.change_request import ChangeRequest
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from shared.models.enums import ChangeRequestStatus, ReportStatus

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
    
    if report.status not in [ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None

    report.status = "approved"
    report.processed_at = datetime.utcnow()
    report.processed_by = admin_guid
    
    # Create ChangeRequest to push to AD
    cr = ChangeRequest(
        user_guid=report.target_user_guid,
        attribute_name=report.attribute_name,
        new_value=report.new_value,
        source="web",
        status="approved",
        resolved_by=admin_guid,
        resolved_at=datetime.utcnow()
    )
    db.add(cr)
    
    db.commit()
    return get_report(db, report_id)

def reject_report(db: Session, report_id: UUID, admin_guid: UUID) -> Optional[Report]:
    report = get_report(db, report_id)
    if not report:
        return None
        
    if report.status not in [ReportStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value]:
        return None
        
    report.status = "rejected"
    report.processed_at = datetime.utcnow()
    report.processed_by = admin_guid
    
    db.commit()
    return get_report(db, report_id)
