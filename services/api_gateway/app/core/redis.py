import redis
from app.core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

def check_brute_force(ip: str) -> bool:
    """
    Returns True if IP is blocked.
    """
    key = f"brute_force:{ip}"
    attempts = redis_client.get(key)
    if attempts and int(attempts) >= 5:
        return True
    return False

def increment_brute_force(ip: str):
    """
    Increments fail counter and sets 15 min block if reached.
    """
    key = f"brute_force:{ip}"
    attempts = redis_client.incr(key)
    if attempts == 1:
        redis_client.expire(key, 900) # 15 minutes
    elif attempts >= 5:
        redis_client.expire(key, 900) # Reset expiry to 15 mins on block

def reset_brute_force(ip: str):
    """
    Resets counter on successful login.
    """
    key = f"brute_force:{ip}"
    redis_client.delete(key)
