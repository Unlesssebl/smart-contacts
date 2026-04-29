from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.db.repository import change_request as cr_repo
from app.db.repository import report as report_repo
from app.schemas.change_request import ChangeRequestRead
from app.schemas.report import ReportRead
from typing import List
from uuid import UUID

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
    return cr_repo.get_change_requests(db)

@router.patch("/change-requests/{request_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    req = cr_repo.approve_request(db, request_id, admin.object_guid)
    if not req:
        # Check if it exists at all to return 404 vs 400
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot approve request with current status")
    return req

@router.patch("/change-requests/{request_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    req = cr_repo.reject_request(db, request_id, admin.object_guid)
    if not req:
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot reject request with current status")
    return req

@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    return report_repo.get_reports(db)

@router.patch("/reports/{report_id}/process", response_model=ReportRead)
def process_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    report = report_repo.process_report(db, report_id, admin.object_guid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
