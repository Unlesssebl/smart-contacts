from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.db.repository import report as report_repo
from app.db.repository import user as user_repo
from app.schemas.report import ReportCreate
from uuid import UUID

router = APIRouter()

@router.post("/", status_code=201)
def create_report(
    data: ReportCreate,
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
        
    # Проверка на дубликат репорта от того же пользователя
    existing_report = report_repo.find_duplicate_report(db, current_user.object_guid, data.target_user_id)
    if existing_report:
        raise HTTPException(status_code=409, detail="You have already reported this user")
    
    # Создание репорта (включая логику эскалации конфликтов)
    new_report = report_repo.create_report(
        db, 
        current_user.object_guid, 
        data.target_user_id, 
        data.reason
    )
    
    return {"id": new_report.id, "status": new_report.status}
