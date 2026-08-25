from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from app.db.repository import report as report_repo
from app.db.repository import user as user_repo
from app.schemas.report import ReportCreateBulk
from app.services.event_service import publish_admin_update

router = APIRouter()

@router.post("", status_code=201)
def create_reports(
    data: ReportCreateBulk,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Запрет репортить самого себя
    if data.target_user_id == current_user.object_guid:
        raise HTTPException(status_code=400, detail="You cannot report yourself")
    
    # Проверка на существование целевого пользователя
    target_user = user_repo.get_user_by_guid(db, str(data.target_user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    if not data.changes:
        raise HTTPException(status_code=400, detail="No changes provided")
    
    # Создание репортов
    new_reports = report_repo.create_reports_bulk(
        db, 
        current_user.object_guid, 
        data.target_user_id, 
        data.changes
    )
    
    publish_admin_update()
    
    return {"created_count": len(new_reports)}
