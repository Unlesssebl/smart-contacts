from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from app.db.session import get_db
from app.api import deps
from app.models.user import User
from app.schemas.user import UserRead, PaginatedUsers, UserFull
from uuid import UUID

router = APIRouter()

@router.get("/", response_model=PaginatedUsers)
def list_users(
    q: Optional[str] = Query(None, description="Fuzzy search by name, department, office"),
    department: Optional[str] = Query(None, description="Filter by exact department name"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = db.query(User).filter(User.status != "RESIGNED")
    
    if department:
        query = query.filter(User.department == department)
    
    if q:
        # Используем оператор % для pg_trgm (fuzzy search)
        query = query.filter(
            or_(
                User.full_name.op("%")(q),
                User.department.op("%")(q),
                User.office_location.op("%")(q)
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
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    departments = db.query(User.department).filter(User.department != None).distinct().all()
    return [d[0] for d in departments]

@router.get("/{user_id}", response_model=UserFull)
def get_user(
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
