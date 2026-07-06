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
    return db.query(Report).filter(Report.id == report_id).first()

def create_report(db: Session, reporter_guid: UUID, target_guid: UUID, reason: str) -> Report:
    new_report = Report(
        target_user_guid=target_guid,
        reporter_user_guid=reporter_guid,
        reason=reason,
        status=ReportStatus.PENDING.value
    )
    db.add(new_report)
    
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
    db.refresh(new_report)
    return new_report

def find_duplicate_report(db: Session, reporter_guid: UUID, target_guid: UUID) -> Optional[Report]:
    return db.query(Report).filter(
        Report.target_user_guid == target_guid,
        Report.reporter_user_guid == reporter_guid,
        Report.status == ReportStatus.PENDING.value
    ).first()

def process_report(db: Session, report_id: UUID, admin_guid: UUID) -> Optional[Report]:
    report = get_report(db, report_id)
    if not report:
        return None
    
    report.status = ReportStatus.PROCESSED.value
    report.processed_at = datetime.utcnow()
    report.processed_by = admin_guid
    
    db.commit()
    db.refresh(report)
    return report
