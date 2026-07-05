import redis
import redis.asyncio as aioredis
from app.core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

async_redis_client = aioredis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

def is_brute_force_blocked(ip: str) -> bool:
    """
    2.3. Атомарная проверка и инкремент счетчика попыток.
    Возвращает True, если IP заблокирован.
    Выполняется атомарно через Lua скрипт.
    """
    key = f"brute_force:{ip}"
    
    # Атомарно инкрементируем и получаем текущее значение
    attempts = redis_client.eval(LUA_RECORD_ATTEMPT, 1, key)
    if attempts and int(attempts) > 5:
        return True
    return False

LUA_RECORD_ATTEMPT = """
local attempts = redis.call('INCR', KEYS[1])
if attempts == 1 then
    redis.call('EXPIRE', KEYS[1], 900)
end
return attempts
"""

def reset_brute_force(ip: str):
    """
    Сброс счетчика при успешном входе.
    """
    key = f"brute_force:{ip}"
    redis_client.delete(key)

def decrement_brute_force(ip: str):
    """
    Уменьшает счетчик попыток (используется при недоступности AD).
    """
    key = f"brute_force:{ip}"
    redis_client.decr(key)
