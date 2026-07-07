import time
import logging
import sys
from app.config import settings
from app.sync import SyncWorker

# Configure file handler for WARNING and above
file_handler = logging.FileHandler("worker_errors.log", encoding="utf-8")
file_handler.setLevel(logging.WARNING)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        file_handler
    ]
)

logger = logging.getLogger("ad_sync_worker")

def main():
    logger.info("Starting AD Sync Worker...")
    worker = SyncWorker()
    
    last_pull_time = 0
    pull_interval = settings.AD_PULL_INTERVAL_SECONDS
    push_interval = 5  # Push every 5 seconds
    
    while True:
        current_time = time.time()
        
        # Check if manual sync was requested
        force_sync_requested = False
        try:
            from app.db import SessionLocal
            from shared.models.system_setting import SystemSetting
            with SessionLocal() as session:
                setting = session.get(SystemSetting, "FORCE_SYNC")
                if setting and setting.value == "1":
                    force_sync_requested = True
                    setting.value = "0"
                    session.commit()
        except Exception as e:
            logger.error(f"Error checking FORCE_SYNC flag: {e}")
        
        # Pull if interval has elapsed or forced
        if force_sync_requested or (current_time - last_pull_time >= pull_interval):
            try:
                worker.pull()
                last_pull_time = current_time
            except Exception as e:
                logger.error(f"Unexpected error in pull loop: {e}")
        
        # Always push frequently
        try:
            worker.push()
        except Exception as e:
            logger.error(f"Unexpected error in push loop: {e}")
            
        time.sleep(push_interval)

if __name__ == "__main__":
    main()
