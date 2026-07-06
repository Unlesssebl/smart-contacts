import logging
import re
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

def apply_ou_mapping_to_users_bg(mapping: dict):
    db = SessionLocal()
    try:
        mapping_lower = {k.lower(): v for k, v in mapping.items()}
        from shared.models.user import User
        
        users = db.query(User).filter(User.ad_dn.isnot(None)).all()
        for user in users:
            user_ous = re.findall(r"OU=([^,]+)", user.ad_dn)
            
            exact_matches = [ou for ou in user_ous if ou in mapping]
            case_insensitive_matches = [ou for ou in user_ous if ou.lower() in mapping_lower]
            
            matches = list(dict.fromkeys(exact_matches + case_insensitive_matches))
            
            if not matches:
                org_name = None
            elif len(matches) == 1:
                key = matches[0]
                org_name = mapping.get(key) or mapping_lower.get(key.lower())
            else:
                selected_ou = exact_matches[0] if exact_matches else matches[0]
                org_name = mapping.get(selected_ou) or mapping_lower.get(selected_ou.lower())
                
            if user.organization != org_name:
                user.organization = org_name
                
        db.commit()
    except Exception as e:
        logger.error(f"Error in apply_ou_mapping_to_users_bg: {e}")
    finally:
        db.close()
