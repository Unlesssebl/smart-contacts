from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from app.schemas.support_ticket import SupportTicketCreate
from app.db.repository import support_ticket as support_repo
from app.services.event_service import publish_admin_update
from app.core.redis import redis_client

router = APIRouter()

GUEST_TICKET_RATE_LIMIT_MAX = 30
GUEST_TICKET_RATE_LIMIT_WINDOW = 600  # 10 minutes

def check_guest_ticket_rate_limit(ip: str) -> bool:
    key = f"rate_limit:guest_ticket:{ip}"
    try:
        current = redis_client.incr(key)
        if current == 1:
            redis_client.expire(key, GUEST_TICKET_RATE_LIMIT_WINDOW)
        return current <= GUEST_TICKET_RATE_LIMIT_MAX
    except Exception:
        return True

@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    request: Request,
    data: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(deps.get_optional_current_user)
):
    # If guest (not logged in), check rate limit and validate name/contact
    if not current_user:
        client_ip = request.client.host if request.client else "unknown"
        if not check_guest_ticket_rate_limit(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много обращений с вашего IP. Пожалуйста, подождите перед отправкой следующего обращения.",
                headers={"Retry-After": str(GUEST_TICKET_RATE_LIMIT_WINDOW)}
            )
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
