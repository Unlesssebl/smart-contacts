from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from app.schemas.support_ticket import SupportTicketCreate
from app.db.repository import support_ticket as support_repo
from app.services.event_service import publish_admin_update

router = APIRouter()

@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    data: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(deps.get_optional_current_user)
):
    # If guest (not logged in), validate name and contact
    if not current_user:
        if not data.sender_name or not data.sender_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пожалуйста, укажите ваше имя"
            )
        if not data.sender_contact or not data.sender_contact.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пожалуйста, укажите контакт для связи (телефон, email или логин)"
            )

    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текст обращения не может быть пустым"
        )

    ticket = support_repo.create_ticket(db, data, current_user)
    publish_admin_update()

    return {
        "status": "ok",
        "id": str(ticket.id),
        "message": "Обращение успешно отправлено",
    }
