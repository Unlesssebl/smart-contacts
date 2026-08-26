# ==============================================================================
# Makefile - Smart Contacts
# ==============================================================================

COMPOSE_PROD = docker compose -f docker-compose.yml
COMPOSE_DEV  = docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help up down restart build logs ps health dev-up dev-down dev-logs test db-backup

help:
	@echo "Использование: make <цель>"
	@echo ""
	@echo "Production команды:"
	@echo "  make up          - Запуск всех сервисов в production-режиме (фоновый режим)"
	@echo "  make down        - Остановка и удаление контейнеров"
	@echo "  make restart     - Перезапуск всех контейнеров"
	@echo "  make build       - Пересборка образов и запуск"
	@echo "  make logs        - Просмотр логов в реальном времени (все сервисы)"
	@echo "  make ps          - Просмотр статуса контейнеров"
	@echo "  make health      - Проверка здоровья API и Nginx"
	@echo "  make db-backup   - Создать резервную копию базы данных PostgreSQL"
	@echo ""
	@echo "Development команды:"
	@echo "  make dev-up      - Запуск в режиме разработки (live mount, hot reload)"
	@echo "  make dev-down    - Остановка dev-окружения"
	@echo "  make dev-logs    - Просмотр логов dev-окружения"
	@echo "  make test        - Запуск тестов (pytest)"

# --- Production ---

up:
	$(COMPOSE_PROD) up -d --remove-orphans

down:
	$(COMPOSE_PROD) down --timeout 30

restart:
	$(COMPOSE_PROD) restart

build:
	$(COMPOSE_PROD) up -d --build --remove-orphans

logs:
	$(COMPOSE_PROD) logs -f --tail=100

ps:
	$(COMPOSE_PROD) ps

health:
	@curl -sk https://127.0.0.1/api/v1/health || curl -sk http://127.0.0.1:8001/health

db-backup:
	@mkdir -p backups
	@BACKUP_FILE="backups/db_backup_$$(date +%Y%m%d_%H%M%S).sql"; \
	echo "Создание бэкапа базы данных в $$BACKUP_FILE..."; \
	docker exec -t smart_contacts_db pg_dump -U Unless -d smart_contacts > "$$BACKUP_FILE" && \
	echo "✅ Бэкап успешно создан: $$BACKUP_FILE"

# --- Development ---

dev-up:
	$(COMPOSE_DEV) up -d --remove-orphans

dev-down:
	$(COMPOSE_DEV) down --timeout 10

dev-logs:
	$(COMPOSE_DEV) logs -f --tail=100

test:
	@echo "Запуск тестов api_gateway..."
	@docker exec -t smart_contacts_api uv run pytest services/api_gateway/tests || uv run --directory services/api_gateway pytest
