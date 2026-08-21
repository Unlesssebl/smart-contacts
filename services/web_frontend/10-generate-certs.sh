#!/bin/sh
# ==============================================================================
# /docker-entrypoint.d/10-generate-certs.sh
# Fallback: генерирует самоподписанные SSL-сертификаты, если корпоративные
# не были предоставлены. Запускается автоматически перед стартом Nginx.
# ==============================================================================
set -e

CERT_FILE="/etc/nginx/certs/cert.pem"
KEY_FILE="/etc/nginx/certs/key.pem"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "[certs] Certificate files found, skipping generation."
    exit 0
fi

echo "[certs] Certificate files not found. Generating self-signed certificate..."

mkdir -p /etc/nginx/certs

# Считываем домен из переменной окружения или используем дефолт
DOMAIN="${NGINX_SERVER_NAME:-contacts.corporate.loc}"

openssl req -x509 \
    -nodes \
    -newkey rsa:2048 \
    -days 3650 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=RU/O=Corporate/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:localhost,IP:127.0.0.1"

chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "[certs] Self-signed certificate generated."
echo "[certs] WARNING: Replace with a corporate CA-signed certificate for production use."
echo "[certs] See scripts/generate_csr.sh for instructions."