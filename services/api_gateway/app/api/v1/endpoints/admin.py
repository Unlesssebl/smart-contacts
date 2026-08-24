from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from app.db.repository import change_request as cr_repo
from app.db.repository import report as report_repo
from app.db.repository import support_ticket as support_repo
from app.schemas.change_request import ChangeRequestRead
from app.schemas.report import ReportRead
from app.schemas.support_ticket import SupportTicketRead
from app.schemas.setting import LDAPSettingsRead, LDAPSettingsUpdate, OuMappingUpdate
from app.core import settings_manager
from typing import List, Dict, Any, Optional
from uuid import UUID
import json
from app.services.ou_service import apply_ou_mapping_to_users_bg
from app.services.event_service import publish_moderation_update, publish_admin_update
from app.schemas.user import UserVisibilityUpdate

router = APIRouter()

@router.get("/change-requests", response_model=List[ChangeRequestRead])
def list_change_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    return cr_repo.get_change_requests(db)

@router.patch("/change-requests/{request_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    req = cr_repo.approve_request(db, request_id, admin.object_guid)
    if not req:
        # Check if it exists at all to return 404 vs 400
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot approve request with current status")
    publish_moderation_update(req.user_guid)
    return req

@router.patch("/change-requests/{request_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    req = cr_repo.reject_request(db, request_id, admin.object_guid)
    if not req:
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot reject request with current status")
    publish_moderation_update(req.user_guid)
    return req

@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    return report_repo.get_reports(db)

@router.patch("/reports/{report_id}/approve", response_model=ReportRead)
def approve_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    report = report_repo.approve_report(db, report_id, admin.object_guid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or cannot be approved")
    publish_moderation_update(report.target_user_guid)
    return report

@router.patch("/reports/{report_id}/reject", response_model=ReportRead)
def reject_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    report = report_repo.reject_report(db, report_id, admin.object_guid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or cannot be rejected")
    publish_moderation_update(report.target_user_guid)
    return report

@router.get("/settings/ldap", response_model=LDAPSettingsRead)
def get_ldap_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    ad_user = settings_manager.get_setting(db, "AD_USER")
    ad_password = settings_manager.get_setting(db, "AD_PASSWORD")
    ldap_status = settings_manager.get_setting(db, "LDAP_STATUS")
    ldap_last_error = settings_manager.get_setting(db, "LDAP_LAST_ERROR")
    return LDAPSettingsRead(
        ad_user=ad_user,
        is_password_set=bool(ad_password),
        status=ldap_status,
        last_error=ldap_last_error
    )

@router.post("/settings/ldap", response_model=LDAPSettingsRead)
def update_ldap_settings(
    settings_data: LDAPSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    if settings_data.ad_user is not None:
        settings_manager.set_setting(db, "AD_USER", settings_data.ad_user)
    
    if settings_data.ad_password is not None:
        settings_manager.set_setting(db, "AD_PASSWORD", settings_data.ad_password, encrypt=True)
        
    settings_manager.bump_ldap_credentials_version(db)
    
    return get_ldap_settings(db, admin)

@router.get("/settings/ou-mapping", response_model=OuMappingUpdate)
def get_ou_mapping(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    mapping_str = settings_manager.get_setting(db, "OU_MAPPING")
    mapping = {}
    if mapping_str:
        try:
            mapping = json.loads(mapping_str)
        except json.JSONDecodeError:
            mapping = {}
    return OuMappingUpdate(mapping=mapping)

@router.post("/settings/ou-mapping", response_model=OuMappingUpdate)
def update_ou_mapping(
    data: OuMappingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    mapping_str = json.dumps(data.mapping, ensure_ascii=False)
    settings_manager.set_setting(db, "OU_MAPPING", mapping_str)
    
    background_tasks.add_task(apply_ou_mapping_to_users_bg, data.mapping)
    
    return get_ou_mapping(db, admin)

@router.get("/ldap/ous", response_model=Dict[str, Any])
def list_ad_ous(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    """Returns list of known OUs collected by the sync worker during the last sync cycle."""
    from shared.models.system_setting import SystemSetting
    setting = db.get(SystemSetting, "KNOWN_OUS")
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except json.JSONDecodeError:
            return {}
    return {}

@router.post("/sync/force")
def force_sync(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    """Signals the AD sync worker to perform an immediate sync cycle."""
    settings_manager.set_setting(db, "FORCE_SYNC", "1")
    return {"status": "ok", "message": "Sync requested"}

@router.patch("/users/{user_id}/visibility")
def update_user_visibility(
    user_id: UUID,
    data: UserVisibilityUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    user = db.query(User).filter(User.object_guid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_hidden = data.is_hidden
    db.commit()
    
    return {"status": "ok", "is_hidden": user.is_hidden}

@router.get("/support-tickets", response_model=List[SupportTicketRead])
def list_support_tickets(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    tickets = support_repo.get_tickets(db, status=status)
    return [support_repo.ticket_to_read_schema(t) for t in tickets]

@router.patch("/support-tickets/{ticket_id}/close", response_model=SupportTicketRead)
def close_support_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    ticket = support_repo.close_ticket(db, ticket_id, admin.object_guid)
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")
    publish_admin_update()
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

from app.schemas.security import SecurityIncidentRead, SecurityUnblockRequest, SecurityBlockRequest
from app.core.redis import get_security_incidents, manual_unblock_ip, manual_block_ip

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

