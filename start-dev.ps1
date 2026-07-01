# Скрипт для локальной разработки (без Docker для микросервисов)

$envFilePath = Join-Path $PSScriptRoot ".env"

Write-Host "Запуск инфраструктуры (БД и Redis) через Docker Compose..." -ForegroundColor Cyan
docker compose up -d db redis

# Функция для загрузки .env файла в PowerShell (если он нужен для Node/др. утилит)
if (Test-Path $envFilePath) {
    Write-Host "Найден файл .env, загрузка переменных..." -ForegroundColor DarkGray
    Get-Content $envFilePath | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
} else {
    Write-Host "ВНИМАНИЕ: Файл .env не найден! Создайте его из .env.example." -ForegroundColor Red
}

# Переопределяем переменные для локального запуска (вне Docker)
$env:DB_HOST = "127.0.0.1"
$env:REDIS_HOST = "127.0.0.1"
$env:PYTHONPATH = ".."
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000/api/v1"

Write-Host "Установка зависимостей и запуск API Gateway..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services\api_gateway; Write-Host 'Запуск API Gateway...'; uv sync; uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Установка зависимостей и запуск AD Sync Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services\ad_sync_worker; Write-Host 'Запуск AD Sync Worker...'; uv sync; uv run python main.py"

Write-Host "Установка зависимостей и запуск Web Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services\web_frontend; Write-Host 'Запуск Web Frontend...'; npm install; npm run dev"

Write-Host "Все сервисы запущены!" -ForegroundColor Green
Write-Host "API Gateway: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Web Frontend: http://localhost:5173 (по умолчанию для Vite)" -ForegroundColor Green
