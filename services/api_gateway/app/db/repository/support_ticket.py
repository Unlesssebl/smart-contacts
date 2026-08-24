from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from shared.models.support_ticket import SupportTicket
from shared.models.user import User
from shared.models.enums import SupportTicketStatus
from app.schemas.support_ticket import SupportTicketCreate, SupportTicketRead

def ticket_to_read_schema(ticket: SupportTicket) -> SupportTicketRead:
    user = ticket.user
    return SupportTicketRead(
        id=ticket.id,
        user_guid=ticket.user_guid,
        sender_name=ticket.sender_name,
        sender_contact=ticket.sender_contact,
        display_sender_name=ticket.display_sender_name,
        display_sender_contact=ticket.display_sender_contact,
        department=user.department if user else None,
        job_title=user.job_title if user else None,
        is_guest=ticket.user_guid is None,
        category=ticket.category,
        message=ticket.message,
        status=ticket.status,
        closed_by=ticket.closed_by,
        closer_name=ticket.closer_name,
        closed_at=ticket.closed_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )

def create_ticket(
    db: Session,
    data: SupportTicketCreate,
    user: Optional[User] = None
) -> SupportTicket:
    user_guid = user.object_guid if user else None
    sender_name = data.sender_name
    sender_contact = data.sender_contact

    if user:
        if not sender_name:
            sender_name = user.full_name
        if not sender_contact:
            contacts = []
            if user.email:
                contacts.append(user.email)
            if user.internal_phone:
                contacts.append(f"вн. {user.internal_phone}")
            if user.mobile_phone:
                contacts.append(user.mobile_phone)
            sender_contact = ", ".join(contacts) if contacts else user.sam_account_name
    else:
        if not sender_name:
            sender_name = "Гость"
        if not sender_contact:
            sender_contact = "Не указано"

    ticket = SupportTicket(
        user_guid=user_guid,
        sender_name=sender_name,
        sender_contact=sender_contact,
        category=data.category,
        message=data.message,
        status=SupportTicketStatus.OPEN.value,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

from sqlalchemy import or_

def get_tickets(
    db: Session,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
) -> tuple[List[SupportTicket], int]:
    query = db.query(SupportTicket).outerjoin(SupportTicket.user).options(
        joinedload(SupportTicket.user),
        joinedload(SupportTicket.closer)
    )
    if status and status != "all":
        query = query.filter(SupportTicket.status == status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SupportTicket.message.ilike(term),
                SupportTicket.sender_name.ilike(term),
                SupportTicket.sender_contact.ilike(term),
                User.full_name.ilike(term),
                User.department.ilike(term),
                User.sam_account_name.ilike(term),
            )
        )

    total = query.count()
    offset = max(0, (page - 1) * page_size)
    items = query.order_by(SupportTicket.created_at.desc()).offset(offset).limit(page_size).all()
    return items, total

def get_ticket(db: Session, ticket_id: UUID) -> Optional[SupportTicket]:
    return db.query(SupportTicket).options(
        joinedload(SupportTicket.user),
        joinedload(SupportTicket.closer)
    ).filter(SupportTicket.id == ticket_id).first()

def close_ticket(db: Session, ticket_id: UUID, admin_guid: UUID) -> Optional[SupportTicket]:
    ticket = get_ticket(db, ticket_id)
    if not ticket:
        return None
    ticket.status = SupportTicketStatus.CLOSED.value
    ticket.closed_by = admin_guid
    ticket.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return ticket

def reopen_ticket(db: Session, ticket_id: UUID) -> Optional[SupportTicket]:
    ticket = get_ticket(db, ticket_id)
    if not ticket:
        return None
    ticket.status = SupportTicketStatus.OPEN.value
    ticket.closed_by = None
    ticket.closed_at = None
    db.commit()
    db.refresh(ticket)
    return ticket
