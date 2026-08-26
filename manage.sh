#!/usr/bin/env bash
# ==============================================================================
# Smart Contacts Management Script
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

COMPOSE_PROD="docker compose -f docker-compose.yml"
COMPOSE_DEV="docker compose -f docker-compose.yml -f docker-compose.dev.yml"

show_help() {
  echo "Использование: ./manage.sh <команда>"
  echo ""
  echo "Production команды:"
  echo "  up          - Запуск всех сервисов в production-режиме (фоновый режим)"
  echo "  down        - Корректная остановка и удаление контейнеров"
  echo "  restart     - Перезапуск всех контейнеров"
  echo "  build       - Пересборка образов и запуск"
  echo "  logs        - Просмотр логов в реальном времени"
  echo "  ps          - Просмотр статуса и здоровья контейнеров"
  echo "  health      - Проверка доступности API эндпоинта"
  echo "  backup      - Создать резервную копию базы данных PostgreSQL"
  echo ""
  echo "Development команды:"
  echo "  dev-up      - Запуск в режиме разработки (live mount, hot reload)"
  echo "  dev-down    - Остановка dev-окружения"
  echo "  dev-logs    - Просмотр логов dev-окружения"
  echo "  test        - Запуск тестов (pytest)"
}

case "$1" in
  up)
    $COMPOSE_PROD up -d --remove-orphans
    ;;
  down)
    $COMPOSE_PROD down --timeout 30
    ;;
  restart)
    $COMPOSE_PROD restart
    ;;
  build)
    $COMPOSE_PROD up -d --build --remove-orphans
    ;;
  logs)
    $COMPOSE_PROD logs -f --tail=100
    ;;
  ps)
    $COMPOSE_PROD ps
    ;;
  health)
    curl -sk https://127.0.0.1/api/v1/health || curl -sk http://127.0.0.1:8001/health
    ;;
  backup)
    mkdir -p backups
    BACKUP_FILE="backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Создание бэкапа базы данных в $BACKUP_FILE..."
    docker exec -t smart_contacts_db pg_dump -U Unless -d smart_contacts > "$BACKUP_FILE"
    echo "✅ Бэкап успешно создан: $BACKUP_FILE"
    ;;
  dev-up)
    $COMPOSE_DEV up -d --remove-orphans
    ;;
  dev-down)
    $COMPOSE_DEV down --timeout 10
    ;;
  dev-logs)
    $COMPOSE_DEV logs -f --tail=100
    ;;
  test)
    docker exec -t smart_contacts_api uv run pytest services/api_gateway/tests || uv run --directory services/api_gateway pytest
    ;;
  *)
    show_help
    ;;
esac
