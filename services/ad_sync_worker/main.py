import time
import logging
import sys
from app.config import settings
from app.db import SessionLocal
from shared.models.system_setting import SystemSetting
from app.sync import SyncWorker
from app.ldap import InvalidLDAPCredentialsError
from app.events import publish_ldap_status_update

# Configure 12-Factor Logging (stdout stream for Docker logging drivers)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("ad_sync_worker")

def set_ldap_status(status: str, last_error: str = ""):
    try:
        with SessionLocal() as session:
            changed = False
            for k, v in [("LDAP_STATUS", status), ("LDAP_LAST_ERROR", last_error)]:
                setting = session.get(SystemSetting, k)
                if setting:
                    if setting.value != v:
                        setting.value = v
                        changed = True
                else:
                    session.add(SystemSetting(key=k, value=v))
                    changed = True
            
            if changed:
                session.commit()
                publish_ldap_status_update()
    except Exception as e:
        logger.error(f"Failed to save LDAP status: {e}")


def get_credentials_version() -> str:
    try:
        with SessionLocal() as session:
            setting = session.get(SystemSetting, "LDAP_CREDENTIALS_VERSION")
            return setting.value if setting else ""
    except Exception:
        return ""

def main():
    logger.info("Starting AD Sync Worker...")
    worker = SyncWorker()
    
    last_pull_time = 0
    last_full_sync_time = time.time()  # Worker start time — first full sync after 24h
    pull_interval = settings.AD_PULL_INTERVAL_SECONDS
    full_sync_interval = 86400  # 24 hours (daily full sync reconciliation)
    push_interval = 5  # Push every 5 seconds
    
    known_cred_version = get_credentials_version()
    credentials_invalid = False
    
    while True:
        current_time = time.time()
        
        if credentials_invalid:
            current_version = get_credentials_version()
            if current_version != known_cred_version:
                logger.info("Credentials version changed, resetting circuit breaker.")
                known_cred_version = current_version
                credentials_invalid = False
            else:
                time.sleep(push_interval)
                continue
        
        force_sync_requested = False
        try:
            with SessionLocal() as session:
                setting = session.get(SystemSetting, "FORCE_SYNC")
                if setting and setting.value == "1":
                    force_sync_requested = True
                    setting.value = "0"
                    session.commit()
        except Exception as e:
            logger.error(f"Error checking FORCE_SYNC flag: {e}")
        
        try:
            if force_sync_requested or (current_time - last_full_sync_time >= full_sync_interval):
                reason = "admin request" if force_sync_requested else "scheduled 24h interval"
                logger.info(f"Running FULL sync cycle ({reason})...")
                worker.pull(full=True)
                last_pull_time = current_time
                last_full_sync_time = current_time
            elif current_time - last_pull_time >= pull_interval:
                worker.pull(full=False)
                last_pull_time = current_time
                
            worker.push()
            set_ldap_status("ok")
        except InvalidLDAPCredentialsError as e:
            logger.error(f"Circuit Breaker OPEN due to auth error: {e}")
            credentials_invalid = True
            set_ldap_status("error", str(e))
        except Exception as e:
            logger.error(f"Unexpected error in sync loop: {e}")
            
        time.sleep(push_interval)

if __name__ == "__main__":
    main()
