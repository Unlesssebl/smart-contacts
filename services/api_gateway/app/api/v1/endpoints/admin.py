from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.models.change_request import ChangeRequest
from app.models.report import Report
from app.schemas.change_request import ChangeRequestRead
from app.schemas.report import ReportRead
from typing import List
from uuid import UUID
from datetime import datetime

router = APIRouter()

def check_admin_auth(current_user: User = Depends(deps.get_current_user)):
    if current_user.role != "it_operator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

@router.get("/change-requests", response_model=List[ChangeRequestRead])
def list_change_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    return db.query(ChangeRequest).order_by(ChangeRequest.created_at.desc()).all()

@router.patch("/change-requests/{request_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    req = db.query(ChangeRequest).filter(ChangeRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    if req.status not in ["pending", "conflict"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status {req.status}")
    
    # Apply changes to user
    user = db.query(User).filter(User.object_guid == req.user_guid).first()
    if user:
        setattr(user, req.attribute_name, req.new_value)
        user.updated_at = datetime.utcnow()
    
    req.status = "approved"
    req.resolved_at = datetime.utcnow()
    req.resolved_by = admin.object_guid
    
    db.commit()
    db.refresh(req)
    return req

@router.patch("/change-requests/{request_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    req = db.query(ChangeRequest).filter(ChangeRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    if req.status not in ["pending", "conflict"]:
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status {req.status}")
    
    req.status = "rejected"
    req.resolved_at = datetime.utcnow()
    req.resolved_by = admin.object_guid
    
    db.commit()
    db.refresh(req)
    return req

@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    return db.query(Report).order_by(Report.created_at.desc()).all()

@router.patch("/reports/{report_id}/process", response_model=ReportRead)
def process_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "processed"
    report.processed_at = datetime.utcnow()
    report.processed_by = admin.object_guid
    
    db.commit()
    db.refresh(report)
    return report
