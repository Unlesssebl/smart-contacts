from typing import List
from fastapi import APIRouter, Depends
from app.api import deps
from shared.models.user import User
from app.schemas.security import (
    SecurityIncidentRead,
    SecurityUnblockRequest,
    SecurityBlockRequest,
)
from app.core.redis import (
    get_security_incidents,
    manual_unblock_ip,
    manual_block_ip,
)
from app.services.event_service import publish_admin_update

router = APIRouter()

@router.get("/security/incidents", response_model=List[SecurityIncidentRead])
def list_security_incidents(
    admin: User = Depends(deps.require_admin)
):
    """
    Возвращает список зафиксированных подозрительных попыток входа и заблокированных IP.
    """
    return get_security_incidents()

@router.post("/security/unblock")
def unblock_ip_address(
    data: SecurityUnblockRequest,
    admin: User = Depends(deps.require_admin)
):
    """
    Разблокирует IP-адрес и сбрасывает счетчик неудачных попыток входа.
    """
    manual_unblock_ip(data.ip)
    publish_admin_update()
    return {"status": "ok", "message": f"IP {data.ip} успешно разблокирован"}

@router.post("/security/block")
def block_ip_address(
    data: SecurityBlockRequest,
    admin: User = Depends(deps.require_admin)
):
    """
    Вручную блокирует IP-адрес (временно или перманентно).
    """
    manual_block_ip(
        ip=data.ip,
        permanent=data.permanent,
        duration_seconds=data.duration_seconds or 3600
    )
    publish_admin_update()
    return {"status": "ok", "message": f"IP {data.ip} заблокирован"}
