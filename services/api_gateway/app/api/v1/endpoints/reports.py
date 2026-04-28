from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.models.report import Report
from app.models.change_request import ChangeRequest
from app.schemas.report import ReportCreate, ReportRead
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
    target_user = db.query(User).filter(User.object_guid == data.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    # Проверка на дубликат репорта от того же пользователя
    existing_report = db.query(Report).filter(
        Report.target_user_guid == data.target_user_id,
        Report.reporter_user_guid == current_user.object_guid,
        Report.status == "new"
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=409, detail="You have already reported this user")
    
    # Создание репорта
    new_report = Report(
        target_user_guid=data.target_user_id,
        reporter_user_guid=current_user.object_guid,
        reason=data.reason,
        status="new"
    )
    db.add(new_report)
    
    # Логика конфликта: если это не первый репорт, переводим заявки в conflict
    report_count = db.query(Report).filter(
        Report.target_user_guid == data.target_user_id,
        Report.status == "new"
    ).count()
    
    # Если есть хотя бы один репорт (включая текущий), и это не защищенный пользователь
    if not target_user.is_protected:
        # Ищем активные заявки пользователя
        active_requests = db.query(ChangeRequest).filter(
            ChangeRequest.user_guid == data.target_user_id,
            ChangeRequest.status == "pending"
        ).all()
        
        for req in active_requests:
            req.status = "conflict"
            
    db.commit()
    db.refresh(new_report)
    
    return {"id": new_report.id, "status": new_report.status}
