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
    
    while True:
        try:
            worker.run_cycle()
        except Exception as e:
            logger.error(f"Unexpected error in sync loop: {e}")
        
        logger.info(f"Sleeping for {settings.AD_PULL_INTERVAL_SECONDS} seconds...")
        time.sleep(settings.AD_PULL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
