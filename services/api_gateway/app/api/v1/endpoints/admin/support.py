import math
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.db.session import get_db
from shared.models.user import User
from app.db.repository import support_ticket as support_repo
from app.schemas.support_ticket import SupportTicketRead, PaginatedSupportTickets
from app.services.event_service import publish_ticket_closed, publish_admin_update

router = APIRouter()

@router.get("/support-tickets", response_model=PaginatedSupportTickets)
def list_support_tickets(
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    tickets, total = support_repo.get_tickets(
        db, status=status, page=page, page_size=page_size, search=search
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedSupportTickets(
        items=[support_repo.ticket_to_read_schema(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.patch("/support-tickets/{ticket_id}/close", response_model=SupportTicketRead)
def close_support_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    ticket = support_repo.close_ticket(db, ticket_id, admin.object_guid)
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")
    publish_ticket_closed(
        ticket.user_guid,
        category=ticket.category,
        message=ticket.message
    )
    return support_repo.ticket_to_read_schema(ticket)

@router.patch("/support-tickets/{ticket_id}/reopen", response_model=SupportTicketRead)
def reopen_support_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    ticket = support_repo.reopen_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")
    publish_admin_update()
    return support_repo.ticket_to_read_schema(ticket)
