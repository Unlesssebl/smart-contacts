from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.db.session import get_db
from shared.models.user import User
from app.db.repository import change_request as cr_repo
from app.db.repository import report as report_repo
from app.schemas.change_request import (
    ChangeRequestRead,
    ChangeRequestUpdateValue,
    BulkReviewActionRequest,
    BulkReviewResult,
)
from app.schemas.report import ReportRead, ReportUpdateValue
from app.services.event_service import (
    publish_moderation_update,
    publish_report_updated,
    publish_admin_update,
)

router = APIRouter()

@router.get("/change-requests", response_model=List[ChangeRequestRead])
def list_change_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    return cr_repo.get_change_requests(db)

@router.patch("/change-requests/{request_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    req = cr_repo.approve_request(db, request_id, admin.object_guid)
    if not req:
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot approve request with current status or user is resigned")
    publish_admin_update()
    return req

@router.patch("/change-requests/{request_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    req = cr_repo.reject_request(db, request_id, admin.object_guid)
    if not req:
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot reject request with current status")
    publish_moderation_update(req.user_guid, rejected_fields=[req.attribute_name])
    return req

@router.patch("/change-requests/{request_id}/value", response_model=ChangeRequestRead)
def update_change_request_value(
    request_id: UUID,
    data: ChangeRequestUpdateValue,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    req = cr_repo.update_request_value(db, request_id, data.new_value)
    if not req:
        raise HTTPException(status_code=404, detail="Change request not found")
    publish_admin_update()
    return req

@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    return report_repo.get_reports(db)

@router.patch("/reports/{report_id}/approve", response_model=ReportRead)
def approve_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    report = report_repo.approve_report(db, report_id, admin.object_guid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or cannot be approved")
    publish_admin_update()
    return report

@router.patch("/reports/{report_id}/reject", response_model=ReportRead)
def reject_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    report = report_repo.reject_report(db, report_id, admin.object_guid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or cannot be rejected")
    publish_report_updated(
        reporter_guid=report.reporter_user_guid,
        target_user_guid=report.target_user_guid,
        attribute_name=report.attribute_name,
        status="rejected",
        target_user_name=report.target_user_name,
        rejection_reason=report.rejection_reason,
    )
    return report

@router.patch("/reports/{report_id}/value", response_model=ReportRead)
def update_report_value(
    report_id: UUID,
    data: ReportUpdateValue,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    report = report_repo.update_report_value(db, report_id, data.new_value)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    publish_admin_update()
    return report

@router.post("/review-items/bulk-approve", response_model=BulkReviewResult)
def bulk_approve_review_items(
    data: BulkReviewActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    approved = 0
    rejected = 0
    skipped = 0
    errors: list[str] = []

    for req_id in data.request_ids:
        try:
            req = cr_repo.approve_request(db, req_id, admin.object_guid)
            if req:
                approved += 1
            else:
                skipped += 1
        except Exception as e:
            errors.append(f"Request {req_id}: {str(e)}")

    for rep_id in data.report_ids:
        try:
            rep = report_repo.approve_report(db, rep_id, admin.object_guid)
            if rep:
                approved += 1
            else:
                skipped += 1
        except Exception as e:
            errors.append(f"Report {rep_id}: {str(e)}")

    publish_admin_update()
    return BulkReviewResult(approved=approved, rejected=rejected, skipped=skipped, errors=errors)

@router.post("/review-items/bulk-reject", response_model=BulkReviewResult)
def bulk_reject_review_items(
    data: BulkReviewActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    approved = 0
    rejected = 0
    skipped = 0
    errors: list[str] = []

    for req_id in data.request_ids:
        try:
            req = cr_repo.reject_request(db, req_id, admin.object_guid)
            if req:
                rejected += 1
                publish_moderation_update(req.user_guid, rejected_fields=[req.attribute_name])
            else:
                skipped += 1
        except Exception as e:
            errors.append(f"Request {req_id}: {str(e)}")

    for rep_id in data.report_ids:
        try:
            rep = report_repo.reject_report(db, rep_id, admin.object_guid)
            if rep:
                rejected += 1
                publish_report_updated(
                    reporter_guid=rep.reporter_user_guid,
                    target_user_guid=rep.target_user_guid,
                    attribute_name=rep.attribute_name,
                    status="rejected",
                    target_user_name=rep.target_user_name,
                    rejection_reason=rep.rejection_reason,
                )
            else:
                skipped += 1
        except Exception as e:
            errors.append(f"Report {rep_id}: {str(e)}")

    publish_admin_update()
    return BulkReviewResult(approved=approved, rejected=rejected, skipped=skipped, errors=errors)
