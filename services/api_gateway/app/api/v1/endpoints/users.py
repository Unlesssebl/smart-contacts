from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import Dict, List, Optional
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from shared.models.enums import UserStatus, UserRole
from app.schemas.user import PaginatedUsers, UserFull
from uuid import UUID

import json
import re

from app.core import settings_manager

router = APIRouter()

@router.get("", response_model=PaginatedUsers)
async def list_users(
    q: Optional[str] = Query(None, description="Fuzzy search by name, department, office"),
    department: Optional[str] = Query(None, description="Filter by exact department name"),
    organization: Optional[str] = Query(None, description="Filter by exact organization name"),
    job_title: Optional[str] = Query(None, description="Filter by exact job title"),
    has_phone: Optional[bool] = Query(None, description="Filter by having a phone number"),
    has_email: Optional[bool] = Query(None, description="Filter by having an email address"),
    hidden_only: Optional[bool] = Query(None, description="Filter by hidden status (Admin only)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.IT_OPERATOR.value]
    
    query = db.query(User).filter(
        User.status != UserStatus.RESIGNED.value,
        User.organization.isnot(None),
        User.organization != '',
        User.organization != '[]'
    )
    if not is_admin:
        query = query.filter(User.is_hidden.is_(False))
    elif hidden_only:
        query = query.filter(User.is_hidden.is_(True))
    
    if department:
        query = query.filter(
            or_(
                User.department == department,
                User.department.ilike(f"{department} / %"),
                User.department.ilike(f"% / {department}"),
                User.department.ilike(f"% / {department} / %"),
                User.department_raw == department,
                User.department_raw.ilike(f"{department} / %"),
                User.department_raw.ilike(f"% / {department}"),
                User.department_raw.ilike(f"% / {department} / %"),
            )
        )
        
    if organization:
        query = query.filter(User.organization == organization)
        
    if job_title:
        query = query.filter(
            or_(
                User.job_title == job_title,
                User.job_title_raw == job_title
            )
        )
        
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
            # Разделяем запрос на отдельные слова
            terms = clean_q.split()
            term_conditions = []
            
            for term in terms:
                # Очищаем слово от всего, кроме цифр, для поиска по телефонам
                phone_term = re.sub(r'\D', '', term)
                
                conditions = [User.full_name.ilike(f"%{term}%")]
                
                if phone_term:
                    # Ищем очищенные от дефисов/пробелов телефоны по очищенному запросу
                    conditions.append(func.regexp_replace(User.internal_phone, '[^0-9]', '', 'g').ilike(f"%{phone_term}%"))
                    conditions.append(func.regexp_replace(User.mobile_phone, '[^0-9]', '', 'g').ilike(f"%{phone_term}%"))
                else:
                    conditions.append(User.internal_phone.ilike(f"%{term}%"))
                    conditions.append(User.mobile_phone.ilike(f"%{term}%"))

                term_conditions.append(or_(*conditions))
            
            # Все введенные слова должны присутствовать в результатах
            query = query.filter(and_(*term_conditions))
            
            # Ранжирование по релевантности: карточки с бОльшим совпадением идут первыми
            query = query.order_by(func.similarity(User.full_name, clean_q).desc(), User.full_name.asc())
        else:
            query = query.order_by(User.full_name.asc())
    else:
        query = query.order_by(User.full_name.asc())
    
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    
    
    if not is_admin:
        for item in items:
            if item in db:
                db.expunge(item)
            item.ad_dn = None
            
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

@router.get("/departments", response_model=List[str])
async def list_departments(
    organization: Optional[str] = Query(None, description="Filter departments by organization"),
    job_title: Optional[str] = Query(None, description="Filter departments by job title"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.IT_OPERATOR.value]
    query = db.query(User.department).filter(
        User.status != UserStatus.RESIGNED.value,
        User.organization.isnot(None),
        User.organization != '',
        User.organization != '[]',
        User.department.isnot(None),
        User.department != '',
        User.department != '[]'
    )
    if not is_admin:
        query = query.filter(User.is_hidden.is_(False))
    if organization:
        query = query.filter(User.organization == organization)
    if job_title:
        query = query.filter(User.job_title == job_title)
        
    raw_departments = query.distinct().all()
    dept_set = set()
    for (d,) in raw_departments:
        if d:
            dept_set.add(d)
            for part in d.split(" / "):
                clean_part = part.strip()
                if clean_part:
                    dept_set.add(clean_part)
                    
    return sorted(dept_set, key=lambda x: x.lower())

@router.get("/organizations", response_model=List[str])
async def list_organizations(
    department: Optional[str] = Query(None, description="Filter organizations by department"),
    job_title: Optional[str] = Query(None, description="Filter organizations by job title"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.IT_OPERATOR.value]
    query = db.query(User.organization).filter(
        User.status != UserStatus.RESIGNED.value,
        User.organization.isnot(None),
        User.organization != '',
        User.organization != '[]'
    )
    if not is_admin:
        query = query.filter(User.is_hidden.is_(False))
    if department:
        query = query.filter(
            or_(
                User.department == department,
                User.department.ilike(f"{department} / %"),
                User.department.ilike(f"% / {department}"),
                User.department.ilike(f"% / {department} / %"),
                User.department_raw == department,
                User.department_raw.ilike(f"{department} / %"),
                User.department_raw.ilike(f"% / {department}"),
                User.department_raw.ilike(f"% / {department} / %"),
            )
        )
    if job_title:
        query = query.filter(
            or_(
                User.job_title == job_title,
                User.job_title_raw == job_title
            )
        )
        
    organizations = query.distinct().order_by(User.organization).all()
    return [o[0] for o in organizations if o[0]]

@router.get("/job-titles", response_model=List[str])
async def list_job_titles(
    organization: Optional[str] = Query(None, description="Filter job titles by organization"),
    department: Optional[str] = Query(None, description="Filter job titles by department"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.IT_OPERATOR.value]
    query = db.query(User.job_title).filter(
        User.status != UserStatus.RESIGNED.value,
        User.organization.isnot(None),
        User.organization != '',
        User.organization != '[]',
        User.job_title.isnot(None),
        User.job_title != '',
        User.job_title != '[]'
    )
    if not is_admin:
        query = query.filter(User.is_hidden.is_(False))
    if organization:
        query = query.filter(User.organization == organization)
    if department:
        query = query.filter(
            or_(
                User.department == department,
                User.department.ilike(f"{department} / %"),
                User.department.ilike(f"% / {department}"),
                User.department.ilike(f"% / {department} / %"),
                User.department_raw == department,
                User.department_raw.ilike(f"{department} / %"),
                User.department_raw.ilike(f"% / {department}"),
                User.department_raw.ilike(f"% / {department} / %"),
            )
        )
        
    job_titles = query.distinct().order_by(User.job_title).all()
    return [j[0] for j in job_titles if j[0]]

@router.get("/{user_id}", response_model=UserFull)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    user = db.query(User).filter(User.object_guid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.IT_OPERATOR.value]
    is_self = current_user.object_guid == user.object_guid
    
    if not (is_admin or is_self):
        if (
            user.is_hidden
            or not user.organization
            or user.organization in ('', '[]')
            or user.status == UserStatus.RESIGNED.value
        ):
            raise HTTPException(status_code=404, detail="User not found")
    
    # Скрытие internal_phone для защищенных профилей
    if user.is_protected and not (current_user.role == UserRole.IT_OPERATOR.value or is_self):
        if user in db:
            db.expunge(user)
        user.internal_phone = None
        
    if not is_admin:
        if user in db:
            db.expunge(user)
        user.ad_dn = None
        
    return user
