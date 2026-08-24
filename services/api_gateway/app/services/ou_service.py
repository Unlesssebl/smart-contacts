import logging
from app.db.session import SessionLocal
from shared.utils import parse_ou_structure
from shared.models.user import User

logger = logging.getLogger(__name__)

def apply_ou_mapping_to_users_bg(mapping: dict):
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.ad_dn.isnot(None)).all()
        for user in users:
            org_name, dept_name, _ = parse_ou_structure(user.ad_dn, mapping, fallback_dept=user.department)
            if user.organization != org_name:
                user.organization = org_name
            if dept_name and user.department != dept_name:
                user.department = dept_name
                
        db.commit()
    except Exception as e:
        logger.error(f"Error in apply_ou_mapping_to_users_bg: {e}")
    finally:
        db.close()

