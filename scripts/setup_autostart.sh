#!/usr/bin/env bash
set -e

# ==============================================================================
# Скрипт установки systemd-службы для автозапуска Smart Contacts
# ==============================================================================

if [ "$EUID" -ne 0 ]; then
  echo "❌ Ошибка: этот скрипт должен быть запущен с правами sudo (sudo bash scripts/setup_autostart.sh)"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SRC="${PROJECT_ROOT}/scripts/smart-contacts.service"
SERVICE_DEST="/etc/systemd/system/smart-contacts.service"

echo "=================================================================="
echo "Установка службы автозапуска Smart Contacts (systemd)"
echo "=================================================================="

# 1. Копируем файл юнита в /etc/systemd/system/
echo "1. Копирование ${SERVICE_SRC} -> ${SERVICE_DEST}..."
cp "${SERVICE_SRC}" "${SERVICE_DEST}"
chmod 644 "${SERVICE_DEST}"

# 2. Перечитываем конфигурацию systemd
echo "2. Перезагрузка конфигурации systemd..."
systemctl daemon-reload

# 3. Включаем автозапуск службы
echo "3. Включение службы smart-contacts.service в автозагрузку..."
systemctl enable smart-contacts.service

echo ""
echo "=================================================================="
echo "✅ Служба автозапуска успешно установлена и включена!"
echo "   Статус службы: systemctl status smart-contacts.service"
echo "   Управление:    sudo systemctl start|stop|restart smart-contacts.service"
echo "=================================================================="
