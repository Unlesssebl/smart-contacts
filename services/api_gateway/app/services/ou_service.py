import json
import logging
from app.db.session import SessionLocal
from shared.utils import parse_ou_structure, apply_canonical_mapping
from shared.models.user import User
from shared.models.system_setting import SystemSetting

logger = logging.getLogger(__name__)

def apply_ou_mapping_to_users_bg(mapping: dict):
    db = SessionLocal()
    try:
        dept_setting = db.get(SystemSetting, "DEPT_MAPPING")
        dept_mapping = {}
        if dept_setting and dept_setting.value:
            try:
                dept_mapping = json.loads(dept_setting.value)
            except json.JSONDecodeError:
                dept_mapping = {}

        users = db.query(User).filter(User.ad_dn.isnot(None)).all()
        for user in users:
            org_name, raw_dept, _ = parse_ou_structure(
                user.ad_dn,
                mapping
            )
            canonical_dept = apply_canonical_mapping(raw_dept, dept_mapping)
            
            user.organization = org_name
            user.department_raw = raw_dept
            user.department = canonical_dept
                
        db.commit()
    except Exception as e:
        logger.error(f"Error in apply_ou_mapping_to_users_bg: {e}")
    finally:
        db.close()


