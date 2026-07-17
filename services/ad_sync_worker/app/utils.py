import random
import time
from typing import Callable, TypeVar, Any
import logging

from .config import settings

T = TypeVar("T")
logger = logging.getLogger(__name__)


def with_retry(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """
    Executes a function with exponential backoff and jitter.
    Formula: T = base * 2^n + jitter
    """
    base = settings.AD_RETRY_BASE_SECONDS
    max_retries = settings.AD_MAX_RETRIES

    for n in range(max_retries + 1):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if n == max_retries:
                logger.error(f"Max retries reached for {func.__name__}. Error: {e}")
                raise e

            # 4.2. Корректная формула Jitter (Full Jitter)
            # Избегаем отрицательных значений и обеспечиваем равномерное распределение
            delay = random.uniform(0, base * (2**n))
            
            logger.warning(
                f"Attempt {n} failed for {func.__name__}: {e}. "
                f"Retrying in {delay:.2f} seconds...",
                exc_info=True
            )
            time.sleep(delay)
    
    # Should not reach here
    raise RuntimeError("Retry loop exited unexpectedly")

import re
from typing import Optional

def format_phone(phone: str) -> Optional[str]:
    """
    Cleans up the phone string from AD. 
    Applies mobile mask if it matches a Russian mobile pattern (10 or 11 digits).
    Leaves other strings as they are to avoid data loss.
    """
    if not phone or phone == "[]":
        return None
        
    cleaned = phone.strip()
    if not cleaned or cleaned == "[]":
        return None
        
    digits_only = re.sub(r'\D', '', cleaned)
    
    if len(digits_only) == 11 and (digits_only.startswith('7') or digits_only.startswith('8')):
        code = digits_only[1:4]
        p1 = digits_only[4:7]
        p2 = digits_only[7:9]
        p3 = digits_only[9:11]
        return f"+7 ({code}) {p1}-{p2}-{p3}"
        
    if len(digits_only) == 10:
        code = digits_only[0:3]
        p1 = digits_only[3:6]
        p2 = digits_only[6:8]
        p3 = digits_only[8:10]
        return f"+7 ({code}) {p1}-{p2}-{p3}"
        
    return cleaned
