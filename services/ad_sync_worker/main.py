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

from prometheus_client import start_http_server, Gauge, Counter

# Prometheus Metrics Definition
SYNC_LAST_SUCCESS_TIMESTAMP = Gauge("ad_sync_last_success_timestamp_seconds", "Timestamp of last successful AD sync cycle")
SYNC_DURATION_SECONDS = Gauge("ad_sync_duration_seconds", "Duration of last AD sync pull in seconds", ["mode"])
SYNC_PULL_TOTAL = Counter("ad_sync_pull_total", "Total AD pull sync operations", ["mode", "status"])
SYNC_PUSH_TOTAL = Counter("ad_sync_push_total", "Total AD push sync operations", ["status"])
SYNC_LDAP_ERRORS_TOTAL = Counter("ad_sync_ldap_errors_total", "Total LDAP errors encountered by worker")

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
    
    # Start Prometheus metrics HTTP server on port 8002
    try:
        start_http_server(8002)
        logger.info("Prometheus metrics server running on :8002/metrics")
    except Exception as e:
        logger.warning(f"Failed to start Prometheus metrics server: {e}")

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
                t0 = time.time()
                try:
                    worker.pull(full=True)
                    SYNC_PULL_TOTAL.labels(mode="full", status="success").inc()
                    SYNC_DURATION_SECONDS.labels(mode="full").set(time.time() - t0)
                    SYNC_LAST_SUCCESS_TIMESTAMP.set_to_current_time()
                except Exception:
                    SYNC_PULL_TOTAL.labels(mode="full", status="error").inc()
                    raise
                last_pull_time = current_time
                last_full_sync_time = current_time
            elif current_time - last_pull_time >= pull_interval:
                t0 = time.time()
                try:
                    worker.pull(full=False)
                    SYNC_PULL_TOTAL.labels(mode="incremental", status="success").inc()
                    SYNC_DURATION_SECONDS.labels(mode="incremental").set(time.time() - t0)
                    SYNC_LAST_SUCCESS_TIMESTAMP.set_to_current_time()
                except Exception:
                    SYNC_PULL_TOTAL.labels(mode="incremental", status="error").inc()
                    raise
                last_pull_time = current_time
                
            try:
                worker.push()
                SYNC_PUSH_TOTAL.labels(status="success").inc()
            except Exception:
                SYNC_PUSH_TOTAL.labels(status="error").inc()
                raise

            set_ldap_status("ok")
        except InvalidLDAPCredentialsError as e:
            logger.error(f"Circuit Breaker OPEN due to auth error: {e}")
            SYNC_LDAP_ERRORS_TOTAL.inc()
            credentials_invalid = True
            set_ldap_status("error", str(e))
        except Exception as e:
            logger.error(f"Unexpected error in sync loop: {e}")
            SYNC_LDAP_ERRORS_TOTAL.inc()
            
        time.sleep(push_interval)

if __name__ == "__main__":
    main()
