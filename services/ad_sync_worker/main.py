import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ad_sync_worker")

def main():
    logger.info("AD Sync Worker starting...")
    while True:
        logger.info("Checking for sync updates...")
        time.sleep(60)

if __name__ == "__main__":
    main()
