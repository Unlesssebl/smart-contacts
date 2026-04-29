import redis
from app.core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

def is_brute_force_blocked(ip: str) -> bool:
    """
    2.3. Атомарная проверка и инкремент счетчика попыток.
    Возвращает True, если IP заблокирован.
    """
    key = f"brute_force:{ip}"
    
    # Получаем текущее значение без инкремента для проверки блокировки
    attempts = redis_client.get(key)
    if attempts and int(attempts) >= 5:
        return True
    return False

def record_failed_attempt(ip: str) -> int:
    """
    Инкрементирует счетчик и возвращает текущее кол-во попыток.
    """
    key = f"brute_force:{ip}"
    attempts = redis_client.incr(key)
    if attempts == 1:
        redis_client.expire(key, 900) # 15 minutes
    elif attempts >= 5:
        redis_client.expire(key, 900) # Reset expiry on block
    return attempts

def reset_brute_force(ip: str):
    """
    Сброс счетчика при успешном входе.
    """
    key = f"brute_force:{ip}"
    redis_client.delete(key)
