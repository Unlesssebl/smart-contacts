import json
from typing import Dict, Any
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.db.session import get_db
from shared.models.user import User
from shared.models.system_setting import SystemSetting
from app.schemas.setting import (
    LDAPSettingsRead,
    LDAPSettingsUpdate,
    OuMappingUpdate,
    CanonicalMappingUpdate,
    CanonicalSuggestionsResponse,
)
from app.core import settings_manager
from app.services.ou_service import apply_ou_mapping_to_users_bg
from app.services.canonical_service import (
    apply_dept_canonical_mapping_bg,
    apply_job_title_canonical_mapping_bg,
    get_canonical_suggestions,
)

router = APIRouter()

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

@router.get("/settings/dept-mapping", response_model=CanonicalMappingUpdate)
def get_dept_mapping(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    mapping_str = settings_manager.get_setting(db, "DEPT_MAPPING")
    mapping = {}
    if mapping_str:
        try:
            mapping = json.loads(mapping_str)
        except json.JSONDecodeError:
            mapping = {}
    return CanonicalMappingUpdate(mapping=mapping)

@router.post("/settings/dept-mapping", response_model=CanonicalMappingUpdate)
def update_dept_mapping(
    data: CanonicalMappingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    mapping_str = json.dumps(data.mapping, ensure_ascii=False)
    settings_manager.set_setting(db, "DEPT_MAPPING", mapping_str)
    background_tasks.add_task(apply_dept_canonical_mapping_bg, data.mapping)
    return CanonicalMappingUpdate(mapping=data.mapping)

@router.get("/settings/job-title-mapping", response_model=CanonicalMappingUpdate)
def get_job_title_mapping(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    mapping_str = settings_manager.get_setting(db, "JOB_TITLE_MAPPING")
    mapping = {}
    if mapping_str:
        try:
            mapping = json.loads(mapping_str)
        except json.JSONDecodeError:
            mapping = {}
    return CanonicalMappingUpdate(mapping=mapping)

@router.post("/settings/job-title-mapping", response_model=CanonicalMappingUpdate)
def update_job_title_mapping(
    data: CanonicalMappingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    mapping_str = json.dumps(data.mapping, ensure_ascii=False)
    settings_manager.set_setting(db, "JOB_TITLE_MAPPING", mapping_str)
    background_tasks.add_task(apply_job_title_canonical_mapping_bg, data.mapping)
    return CanonicalMappingUpdate(mapping=data.mapping)

@router.get("/canonical/suggestions", response_model=CanonicalSuggestionsResponse)
def list_canonical_suggestions(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    return get_canonical_suggestions(db)

@router.get("/ldap/ous", response_model=Dict[str, Any])
def list_ad_ous(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.require_admin)
):
    """Returns list of known OUs collected by the sync worker during the last sync cycle."""
    setting = db.get(SystemSetting, "KNOWN_OUS")
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except json.JSONDecodeError:
            return {}
    return {}
