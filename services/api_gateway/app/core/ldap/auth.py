import logging
import queue
from typing import Optional
from ldap3 import Connection, SIMPLE
from ldap3.utils.conv import escape_filter_chars
from app.core.config import settings
from app.db.session import SessionLocal
from app.core.settings_manager import get_setting
from .connection import server_pool
from .pool import auth_pool, get_search_pool
from .schemas import LdapUser

logger = logging.getLogger(__name__)

import re
from .exceptions import (
    LdapAuthError,
    LdapWorkstationRestrictionError,
    LdapPasswordExpiredError,
    LdapAccountDisabledError,
    LdapAccountLockedError,
)

def _parse_ad_error_code(result_dict: dict) -> Optional[str]:
    message = str(result_dict.get("message") or "")
    match = re.search(r"data\s+([0-9a-fA-F]+)", message)
    if match:
        return match.group(1).lower()
    return None

def authenticate_via_ldap(username: str, password: str) -> Optional[LdapUser]:
    if not password:
        return None

    search_pool_conn = get_search_pool()
    safe_username = escape_filter_chars(username)
    search_filter = f"(sAMAccountName={safe_username})"
    user_dn: Optional[str] = None
    user_data: Optional[LdapUser] = None
    ad_user_for_domain = None

    try:
        if search_pool_conn:
            # We need to get the AD_USER to extract the domain for bind fallback later
            db = SessionLocal()
            try:
                ad_user_for_domain = get_setting(db, "AD_USER")
            finally:
                db.close()
                
            try:
                search_pool_conn.search(
                    search_base=settings.AD_BASE_DN,
                    search_filter=search_filter,
                    attributes=["objectGUID", "displayName", "department", "title", "distinguishedName", "mobile", "telephoneNumber", "physicalDeliveryOfficeName"]
                )
                entries = list(search_pool_conn.entries)
                if entries:
                    entry = entries[0]
                    user_dn = entry.distinguishedName.value
                    user_data = LdapUser.from_entry(entry, username)
            except Exception as se:
                logger.warning(f"Initial LDAP search failed, falling back to direct UPN bind: {se}")

        # Bind: fallback — UPN
        ad_domain = ad_user_for_domain.split("@")[-1] if ad_user_for_domain and "@" in ad_user_for_domain else "corporate.loc"
        user_bind_value = user_dn if user_dn else (
            username if "@" in username else f"{username}@{ad_domain}"
        )

        # Проверка пароля — используем пул соединений с одной попыткой повтора
        for attempt in range(2):
            if attempt == 0:
                try:
                    auth_conn = auth_pool.get_nowait()
                    auth_conn.user = user_bind_value
                    auth_conn.password = password
                except queue.Empty:
                    auth_conn = Connection(
                        server_pool,
                        user=user_bind_value,
                        password=password,
                        authentication=SIMPLE,
                        check_names=True,
                        raise_exceptions=False
                    )
            else:
                # Вторая попытка: создаем полностью новое соединение, игнорируя пул
                auth_conn = Connection(
                    server_pool,
                    user=user_bind_value,
                    password=password,
                    authentication=SIMPLE,
                    check_names=True,
                    raise_exceptions=False
                )

            try:
                logger.info(f"Attempting LDAP bind for: {user_bind_value} (attempt {attempt + 1})")
                if not auth_conn.bind():
                    res = auth_conn.result or {}
                    logger.warning(f"Failed LDAP bind for {user_bind_value}: {res}")
                    try:
                        auth_pool.put_nowait(auth_conn)
                    except queue.Full:
                        auth_conn.unbind()

                    ad_code = _parse_ad_error_code(res)
                    if ad_code == "531":
                        raise LdapWorkstationRestrictionError(
                            "Вход ограничен политикой рабочих станций в Active Directory (параметр «Вход в систему...»). "
                            "Обратитесь к системному администратору."
                        )
                    elif ad_code in ("532", "773"):
                        raise LdapPasswordExpiredError(
                            "Срок действия пароля в Active Directory истек. Пожалуйста, смените пароль на рабочей станции."
                        )
                    elif ad_code == "533":
                        raise LdapAccountDisabledError(
                            "Учетная запись отключена в Active Directory. Обратитесь к системному администратору."
                        )
                    elif ad_code == "775":
                        raise LdapAccountLockedError(
                            "Учетная запись заблокирована в Active Directory из-за превышения числа ошибок. Обратитесь в техподдержку."
                        )
                    elif ad_code == "530":
                        raise LdapAuthError(
                            "Вход в данное время запрещен политикой учетной записи в Active Directory."
                        )
                    elif ad_code == "701":
                        raise LdapAuthError(
                            "Срок действия учетной записи в Active Directory истек."
                        )

                    return None

                logger.info(f"Successfully authenticated user: {username}")

                if not user_data:
                    auth_conn.search(
                        search_base=settings.AD_BASE_DN,
                        search_filter=search_filter,
                        attributes=["objectGUID", "displayName", "department", "title", "distinguishedName", "mobile", "telephoneNumber", "physicalDeliveryOfficeName"]
                    )
                    entries = list(auth_conn.entries)
                    if entries:
                        user_data = LdapUser.from_entry(entries[0], username)
                    else:
                        user_data = LdapUser(object_guid=None, full_name=username)

                try:
                    auth_pool.put_nowait(auth_conn)
                except queue.Full:
                    auth_conn.unbind()

                return user_data

            except Exception as e:
                logger.warning(f"LDAP bind or search exception on attempt {attempt + 1}: {str(e)}")
                try:
                    auth_conn.unbind()
                except Exception:
                    pass
                
                if attempt == 0:
                    logger.info("Retrying LDAP authentication with a fresh connection...")
                    continue
                else:
                    raise ConnectionError(f"LDAP Service Unavailable: {str(e)}")

    except Exception as e:
        logger.error(f"LDAP exception: {str(e)}")
        raise ConnectionError(f"LDAP Service Unavailable: {str(e)}")
