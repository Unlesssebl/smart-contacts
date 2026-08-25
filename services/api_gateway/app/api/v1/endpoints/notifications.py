from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.db.session import get_db
from app.db.repository import notification as notif_repo
from app.schemas.notification import (
    NotificationListResponse,
    NotificationRead,
    UnreadCountResponse,
)
from shared.models.user import User

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def list_my_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    items, total, unread_count = notif_repo.get_user_notifications(
        db,
        user_guid=current_user.object_guid,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )
    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_my_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    count = notif_repo.get_unread_count(db, user_guid=current_user.object_guid)
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    notif = notif_repo.mark_as_read(
        db,
        notification_id=notification_id,
        user_guid=current_user.object_guid,
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif


@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    updated = notif_repo.mark_all_as_read(db, user_guid=current_user.object_guid)
    return {"status": "ok", "updated_count": updated}


@router.delete("/{notification_id}")
def delete_single_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    success = notif_repo.delete_notification(
        db,
        notification_id=notification_id,
        user_guid=current_user.object_guid,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "ok"}


@router.delete("")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    deleted = notif_repo.clear_user_notifications(db, user_guid=current_user.object_guid)
    return {"status": "ok", "deleted_count": deleted}
