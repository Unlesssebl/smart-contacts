from typing import Tuple, List, Dict, Any, Optional
import json
from datetime import datetime, timezone
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

TRACKED_IPS_SET = "brute_force:tracked_ips"

LUA_RECORD_FAILED_LOGIN = """
local ip = ARGV[1]
local max_attempts = tonumber(ARGV[2])
local base_ban = tonumber(ARGV[3])
local max_ban = tonumber(ARGV[4])
local window = tonumber(ARGV[5])
local perm_attempts = tonumber(ARGV[6])
local current_time = ARGV[7]
local sam_account = ARGV[8]

-- Add IP to set of tracked IPs
redis.call('SADD', KEYS[4], ip)

-- Increment attempt counter
local attempts = redis.call('INCR', KEYS[2])
if attempts == 1 then
    redis.call('EXPIRE', KEYS[2], window)
end

local is_perm = 0
if attempts >= perm_attempts then
    is_perm = 1
end

local meta_json = string.format('{"last_sam":%q,"last_attempt_at":%q,"attempts":%d,"is_permanent":%s}', sam_account, current_time, attempts, is_perm == 1 and "true" or "false")
redis.call('SET', KEYS[3], meta_json)

if attempts >= perm_attempts then
    redis.call('SET', KEYS[1], 'permanent')
    redis.call('PERSIST', KEYS[2])
    redis.call('PERSIST', KEYS[3])
    return {2, -1, attempts}
end

if attempts > max_attempts then
    local level = attempts - max_attempts - 1
    local ban_time = base_ban * (2 ^ level)
    if ban_time > max_ban then
        ban_time = max_ban
    end
    ban_time = math.floor(ban_time)
    
    redis.call('SET', KEYS[1], 'temp', 'EX', ban_time)
    
    local attempts_ttl = ban_time + window
    redis.call('EXPIRE', KEYS[2], attempts_ttl)
    redis.call('EXPIRE', KEYS[3], attempts_ttl)
    
    return {1, ban_time, attempts}
else
    redis.call('EXPIRE', KEYS[3], window)
    return {0, 0, attempts}
end
"""

def check_brute_force_block(ip: str) -> Tuple[bool, int, bool]:
    """
    Проверяет, заблокирован ли IP в данный момент (без изменения счетчиков).
    
    Возвращает:
    - (is_blocked: bool, retry_after_seconds: int, is_permanent: bool)
    """
    block_key = f"brute_force:block:{ip}"
    try:
        val = redis_client.get(block_key)
        if val == "permanent":
            return True, -1, True
        elif val is not None:
            ttl = redis_client.ttl(block_key)
            if ttl and ttl > 0:
                return True, ttl, False
    except Exception:
        pass
    return False, 0, False


def is_brute_force_blocked(ip: str, sam_account: str = "") -> Tuple[bool, int, bool]:
    """
    Проверка текущего статуса блокировки (alias для check_brute_force_block).
    """
    return check_brute_force_block(ip)


def record_failed_login(ip: str, sam_account: str = "") -> Tuple[bool, int, bool]:
    """
    Атомарная фиксация неудачной попытки входа в Redis.
    Вызывается ТОЛЬКО когда пароль действительно неверен.
    
    Возвращает:
    - (is_blocked: bool, retry_after_seconds: int, is_permanent: bool)
    """
    block_key = f"brute_force:block:{ip}"
    attempts_key = f"brute_force:attempts:{ip}"
    meta_key = f"brute_force:meta:{ip}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    try:
        res = redis_client.eval(
            LUA_RECORD_FAILED_LOGIN,
            4,
            block_key,
            attempts_key,
            meta_key,
            TRACKED_IPS_SET,
            ip,
            settings.BRUTE_FORCE_MAX_ATTEMPTS,
            settings.BRUTE_FORCE_BASE_BAN_SECONDS,
            settings.BRUTE_FORCE_MAX_BAN_SECONDS,
            settings.BRUTE_FORCE_WINDOW_SECONDS,
            settings.BRUTE_FORCE_PERMANENT_ATTEMPTS,
            now_iso,
            sam_account or ""
        )
        if isinstance(res, (list, tuple)) and len(res) >= 2:
            status_code = int(res[0])
            retry_after = int(res[1])
            if status_code == 2:
                return True, -1, True
            elif status_code == 1:
                return True, retry_after, False
            return False, 0, False
        elif res:
            return True, settings.BRUTE_FORCE_BASE_BAN_SECONDS, False
    except Exception:
        pass
    return False, 0, False

def reset_brute_force(ip: str):
    """
    Сброс счетчика и блокировки при успешном входе или разблокировке администратором.
    """
    block_key = f"brute_force:block:{ip}"
    attempts_key = f"brute_force:attempts:{ip}"
    meta_key = f"brute_force:meta:{ip}"
    legacy_key = f"brute_force:{ip}"
    
    redis_client.delete(block_key, attempts_key, meta_key, legacy_key)
    redis_client.srem(TRACKED_IPS_SET, ip)

def decrement_brute_force(ip: str):
    """
    Уменьшает счетчик попыток и снимает временную блокировку (используется при недоступности AD).
    """
    block_key = f"brute_force:block:{ip}"
    attempts_key = f"brute_force:attempts:{ip}"
    meta_key = f"brute_force:meta:{ip}"
    legacy_key = f"brute_force:{ip}"
    
    # Do not clear permanent block automatically on network error
    block_val = redis_client.get(block_key)
    if block_val != "permanent":
        redis_client.delete(block_key)
        
    if redis_client.exists(attempts_key):
        val = redis_client.decr(attempts_key)
        if val <= 0:
            redis_client.delete(attempts_key, meta_key)
            redis_client.srem(TRACKED_IPS_SET, ip)
    elif redis_client.exists(legacy_key):
        val = redis_client.decr(legacy_key)
        if val <= 0:
            redis_client.delete(legacy_key)
            redis_client.srem(TRACKED_IPS_SET, ip)

def get_security_incidents() -> List[Dict[str, Any]]:
    """
    Возвращает список всех подозрительных и заблокированных IP адресов для панели администратора.
    """
    try:
        ips = redis_client.smembers(TRACKED_IPS_SET)
    except Exception:
        return []
        
    incidents = []
    for ip in ips:
        block_key = f"brute_force:block:{ip}"
        attempts_key = f"brute_force:attempts:{ip}"
        meta_key = f"brute_force:meta:{ip}"
        
        try:
            attempts_raw = redis_client.get(attempts_key)
            block_val = redis_client.get(block_key)
            block_ttl = redis_client.ttl(block_key)
            meta_raw = redis_client.get(meta_key)
            
            # If no attempts and no block, clean up from tracked set
            if not attempts_raw and not block_val:
                redis_client.srem(TRACKED_IPS_SET, ip)
                continue
                
            attempts = int(attempts_raw) if attempts_raw else 0
            is_permanent = (block_val == "permanent") or (attempts >= settings.BRUTE_FORCE_PERMANENT_ATTEMPTS)
            is_blocked = bool(block_val) or (block_ttl is not None and block_ttl > 0) or is_permanent
            retry_after = -1 if is_permanent else max(0, block_ttl if (block_ttl and block_ttl > 0) else 0)
            
            last_sam = ""
            last_attempt_at = None
            if meta_raw:
                try:
                    meta = json.loads(meta_raw)
                    last_sam = meta.get("last_sam", "")
                    last_attempt_at = meta.get("last_attempt_at")
                except Exception:
                    pass
                    
            incidents.append({
                "ip": ip,
                "attempts": attempts,
                "is_blocked": is_blocked,
                "is_permanent": is_permanent,
                "retry_after": retry_after,
                "last_sam": last_sam,
                "last_attempt_at": last_attempt_at
            })
        except Exception:
            continue
            
    # Sort: permanent blocks first, then active blocks, then highest attempts count
    incidents.sort(key=lambda x: (x["is_permanent"], x["is_blocked"], x["attempts"]), reverse=True)
    return incidents

def manual_block_ip(ip: str, permanent: bool = True, duration_seconds: int = 3600) -> bool:
    """
    Ручная блокировка IP администратором.
    """
    block_key = f"brute_force:block:{ip}"
    attempts_key = f"brute_force:attempts:{ip}"
    meta_key = f"brute_force:meta:{ip}"
    
    redis_client.sadd(TRACKED_IPS_SET, ip)
    attempts = int(redis_client.get(attempts_key) or 0)
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if permanent:
        redis_client.set(block_key, "permanent")
        redis_client.set(attempts_key, max(attempts, settings.BRUTE_FORCE_PERMANENT_ATTEMPTS))
        meta = {
            "last_sam": "ручная блокировка",
            "last_attempt_at": now_iso,
            "attempts": max(attempts, settings.BRUTE_FORCE_PERMANENT_ATTEMPTS),
            "is_permanent": True
        }
        redis_client.set(meta_key, json.dumps(meta, ensure_ascii=False))
    else:
        redis_client.set(block_key, "temp", ex=duration_seconds)
        redis_client.set(attempts_key, max(attempts, settings.BRUTE_FORCE_MAX_ATTEMPTS + 1), ex=duration_seconds + settings.BRUTE_FORCE_WINDOW_SECONDS)
        meta = {
            "last_sam": "ручная блокировка",
            "last_attempt_at": now_iso,
            "attempts": max(attempts, settings.BRUTE_FORCE_MAX_ATTEMPTS + 1),
            "is_permanent": False
        }
        redis_client.set(meta_key, json.dumps(meta, ensure_ascii=False), ex=duration_seconds + settings.BRUTE_FORCE_WINDOW_SECONDS)
    return True

def manual_unblock_ip(ip: str) -> bool:
    """
    Снятие блокировки и сброс счетчика IP адреса администратором.
    """
    reset_brute_force(ip)
    return True

