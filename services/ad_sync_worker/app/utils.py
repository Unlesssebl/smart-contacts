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

            jitter = random.uniform(-0.1, 0.1) * base * (2**n)
            delay = base * (2**n) + jitter
            
            logger.warning(
                f"Attempt {n} failed for {func.__name__}: {e}. "
                f"Retrying in {delay:.2f} seconds..."
            )
            time.sleep(max(0, delay))
    
    # Should not reach here
    raise RuntimeError("Retry loop exited unexpectedly")
