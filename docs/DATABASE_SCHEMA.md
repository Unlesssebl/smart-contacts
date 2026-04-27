# Спецификация БД (PostgreSQL - Staging Area)

## Таблица `users` (Профили сотрудников)
- `id` (UUID, PK)
- `tg_id` (BigInt, Unique, Nullable) - Ключ для связки с Telegram-ботом
- `sam_account_name` (String, Unique) - Логин из AD
- `full_name` (String)
- `mobile_phone` (String, E.164 format)
- `extension_number` (String) - Добавочный/Внутренний
- `department` (String)
- `office_location` (String)
- `is_verified` (Boolean, Default: False) - Пройдена ли проверка Gatekeeper
- `is_protected` (Boolean, Default: False) - VIP-защита профиля от изменений/репортов
- `grace_period_left` (Integer, Default: 3) - Количество попыток отложить проверку
- `last_sync_timestamp` (Timestamp) - Время последней синхронизации из AD
- `sync_error_log` (Text, Nullable) - Лог последней ошибки синхронизации

## Таблица `change_requests` (Очередь изменений)
- `id` (UUID, PK)
- `user_id` (FK -> users.id)
- `attribute_name` (String)
- `new_value` (String)
- `source` (Enum: 'web', 'bot')
- `status` (Enum: 'pending', 'conflict', 'approved', 'applied')
- `created_at` (Timestamp)

## Таблица `reports` (Жалобы на контакты)
- `id` (UUID, PK)
- `target_user_id` (FK -> users.id)
- `reporter_user_id` (FK -> users.id)
- `status` (Enum: 'new', 'processed')
- `created_at` (Timestamp)