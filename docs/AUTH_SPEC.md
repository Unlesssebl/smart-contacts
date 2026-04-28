# Спецификация аутентификации и авторизации

## Технология

| Уровень | Технология |
|---------|-----------|
| Аутентификация | **LDAP BIND** через корпоративный AD (библиотека `ldap3`) |
| Сессия | **JWT** (access token, 30 мин) + **Refresh Token** (JSON body, 7 дней, хранится в БД) |
| Статус сотрудника | Парсится из суффикса `sAMAccountName` в AD Sync Worker (`-uv` → `RESIGNED`, `-time` → `ON_LEAVE`) |

---

## Flow аутентификации

```
[Браузер/Бот] → POST /auth/login {username, password}
                      ↓
              [API Gateway] → LDAP BIND к AD с переданными кредами
                      ↓ (успех)
              Найти/создать запись в таблице users по sam_account_name
                      ↓
              Создать JWT (payload: object_guid, role, sam_account_name)
              Создать Refresh Token (UUID v4, сохранить SHA-256 хэш в таблице refresh_tokens)
                      ↓
              Вернуть { access_token, refresh_token } в теле JSON
```

**Важно**: API Gateway **не хранит** пароль пользователя. LDAP BIND — единственная точка проверки. Пароли пользователей никогда не логируются и не сохраняются даже во временных переменных воркера.

---

## Структура JWT (Access Token)

```json
{
  "sub": "uuid-пользователя",
  "sam": "ivanov_ii",
  "role": "employee",
  "dept": "ИТ-отдел",
  "exp": 1714215600,
  "iat": 1714213800
}
```

- `sub` — `object_guid` пользователя из таблицы `users` (он же `objectGUID` из AD — первичный ключ системы)
- `role` — роль из БД (см. ниже)

---

## Ролевая модель

### Роли пользователей

| Роль | `role` в БД | Источник назначения |
|------|------------|---------------------|
| Обычный сотрудник | `employee` | По умолчанию при первой синхронизации |
| ИТ-оператор | `it_operator` | Вручную через прямое изменение в БД |

> Повышение роли — ручная операция через psql/миграцию. UI для управления ролями не предусмотрен в MVP.

---

## Матрица прав доступа (по операциям)

| Операция | `employee` | `it_operator` |
|---|---|---|
| Просмотр справочника (`GET /users`) | ✅ | ✅ |
| Просмотр своего профиля | ✅ | ✅ |
| Просмотр чужого профиля (без `mobile_phone` у `is_protected`) | ✅ | ✅ (полный) |
| Подать заявку на изменение своих данных | ✅ | ✅ |
| Пропустить Gatekeeper (skip) | ✅ | ✅ |
| Подать репорт на чужой профиль | ✅ | ✅ |
| Просмотр всех `change_requests` | ❌ | ✅ |
| Одобрить `change_request` | ❌ | ✅ |
| Отклонить `change_request` | ❌ | ✅ |
| Просмотр репортов (`GET /reports`) | ❌ | ✅ |
| Обработка репортов (`PATCH /reports/{id}/process`) | ❌ | ✅ |
| IT-дашборд (`GET /admin/dashboard`) | ❌ | ✅ |
| Принудительная синхронизация (`POST /admin/sync/force`) | ❌ | ✅ |

---

## Реализация проверки прав (FastAPI Depends)

```python
# Пример dependency для IT-Operator
async def require_it_operator(token_data: TokenPayload = Depends(get_current_user)):
    if token_data.role != "it_operator":
        raise HTTPException(status_code=403, detail="IT Operator access required")
    return token_data
```

---

## Переменные окружения (связанные с Auth)

| Переменная | Назначение |
|-----------|-----------|
| `SECRET_KEY` | Ключ подписи JWT (min 32 символа, random) |
| `ALGORITHM` | Алгоритм JWT (`HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни access token (default: 30) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Время жизни refresh token (default: 7) |
| `AD_SERVER` | LDAP-сервер для BIND (`ldap://ad.example.local`) |
| `AD_BASE_DN` | Базовый DN для поиска пользователя (`DC=example,DC=local`) |

---

## Защита от атак

- **Brute-force**: После 5 неудачных LDAP BIND подряд — блокировка IP на 15 минут. Счетчик попыток хранится в **Redis**, чтобы обеспечить синхронизацию между несколькими экземплярами API Gateway.
- **Refresh Token Rotation**: При каждом обновлении access-токена старый refresh-токен должен немедленно аннулироваться (`revoked = true`), а пользователю выдаваться новая пара.
- **Безопасность паролей**: Пароли пользователей при LDAP BIND никогда не логируются и не сохраняются даже во временных переменных воркера.
- **HTTPS Only**: В продакшне — только HTTPS. JWT не передаётся в URL.
