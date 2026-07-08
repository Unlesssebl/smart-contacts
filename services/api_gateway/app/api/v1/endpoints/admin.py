from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api import deps
from shared.models.user import User
from shared.models.enums import UserRole
from app.db.repository import change_request as cr_repo
from app.db.repository import report as report_repo
from app.schemas.change_request import ChangeRequestRead
from app.schemas.report import ReportRead
from app.schemas.setting import LDAPSettingsRead, LDAPSettingsUpdate, OuMappingUpdate
from app.core import settings_manager
from typing import List, Dict, Any
from uuid import UUID
import json
from app.services.ou_service import apply_ou_mapping_to_users_bg

router = APIRouter()

def check_admin_auth(current_user: User = Depends(deps.get_current_user)):
    if current_user.role not in [UserRole.IT_OPERATOR.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

@router.get("/change-requests", response_model=List[ChangeRequestRead])
def list_change_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    return cr_repo.get_change_requests(db)

@router.patch("/change-requests/{request_id}/approve", response_model=ChangeRequestRead)
def approve_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    req = cr_repo.approve_request(db, request_id, admin.object_guid)
    if not req:
        # Check if it exists at all to return 404 vs 400
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot approve request with current status")
    return req

@router.patch("/change-requests/{request_id}/reject", response_model=ChangeRequestRead)
def reject_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    req = cr_repo.reject_request(db, request_id, admin.object_guid)
    if not req:
        existing = cr_repo.get_change_request(db, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(status_code=400, detail="Cannot reject request with current status")
    return req

@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    return report_repo.get_reports(db)

@router.patch("/reports/{report_id}/process", response_model=ReportRead)
def process_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
):
    report = report_repo.process_report(db, report_id, admin.object_guid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/settings/ldap", response_model=LDAPSettingsRead)
def get_ldap_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
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
    admin: User = Depends(check_admin_auth)
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
    admin: User = Depends(check_admin_auth)
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
    admin: User = Depends(check_admin_auth)
):
    mapping_str = json.dumps(data.mapping, ensure_ascii=False)
    settings_manager.set_setting(db, "OU_MAPPING", mapping_str)
    
    background_tasks.add_task(apply_ou_mapping_to_users_bg, data.mapping)
    
    return get_ou_mapping(db, admin)

@router.get("/ldap/ous", response_model=Dict[str, Any])
def list_ad_ous(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_auth)
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
    admin: User = Depends(check_admin_auth)
):
    """Signals the AD sync worker to perform an immediate sync cycle."""
    settings_manager.set_setting(db, "FORCE_SYNC", "1")
    return {"status": "ok", "message": "Sync requested"}
