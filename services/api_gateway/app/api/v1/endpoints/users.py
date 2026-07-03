from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.schemas.user import PaginatedUsers, UserFull
from uuid import UUID

import re

router = APIRouter()

@router.get("/", response_model=PaginatedUsers)
async def list_users(
    q: Optional[str] = Query(None, description="Fuzzy search by name, department, office"),
    department: Optional[str] = Query(None, description="Filter by exact department name"),
    organization: Optional[str] = Query(None, description="Filter by exact organization name"),
    job_title: Optional[str] = Query(None, description="Filter by exact job title"),
    has_phone: Optional[bool] = Query(None, description="Filter by having a phone number"),
    has_email: Optional[bool] = Query(None, description="Filter by having an email address"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = db.query(User).filter(User.status != "RESIGNED")
    
    if department:
        query = query.filter(User.department == department)
        
    if organization:
        query = query.filter(User.organization == organization)
        
    if job_title:
        query = query.filter(User.job_title == job_title)
        
    if has_phone:
        query = query.filter(
            or_(
                and_(User.internal_phone.isnot(None), User.internal_phone != '', User.internal_phone != '[]'),
                and_(User.mobile_phone.isnot(None), User.mobile_phone != '', User.mobile_phone != '[]')
            )
        )
        
    if has_email:
        query = query.filter(
            User.email.isnot(None),
            User.email != '',
            User.email != '[]'
        )
    
    if q:
        # 2.1. Санитизация ввода для предотвращения SQL-инъекций и ошибок pg_trgm
        # Оставляем только буквы, цифры, пробелы, точки и дефисы
        clean_q = re.sub(r'[^\w\s\.-]', '', q).strip()
        if clean_q:
            # Используем оператор % для pg_trgm (fuzzy search)
            query = query.filter(
                or_(
                    User.full_name.op("%")(clean_q),
                    User.department.op("%")(clean_q),
                    User.office_location.op("%")(clean_q),
                    User.organization.op("%")(clean_q)
                )
            )
    
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

@router.get("/departments", response_model=List[str])
async def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    departments = db.query(User.department).filter(User.department.isnot(None), User.department != '', User.department != '[]').distinct().order_by(User.department).all()
    return [d[0] for d in departments]

@router.get("/organizations", response_model=List[str])
async def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    organizations = db.query(User.organization).filter(User.organization.isnot(None), User.organization != '', User.organization != '[]').distinct().order_by(User.organization).all()
    return [o[0] for o in organizations]

@router.get("/job-titles", response_model=List[str])
async def list_job_titles(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    job_titles = db.query(User.job_title).filter(User.job_title.isnot(None), User.job_title != '', User.job_title != '[]').distinct().order_by(User.job_title).all()
    return [j[0] for j in job_titles]

@router.get("/{user_id}", response_model=UserFull)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    user = db.query(User).filter(User.object_guid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Скрытие internal_phone для защищенных профилей
    if user.is_protected and current_user.role != "it_operator":
        user.internal_phone = None
        
    return user
