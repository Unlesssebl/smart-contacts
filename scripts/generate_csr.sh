#!/usr/bin/env bash
set -e

# ==============================================================================
# Скрипт генерации CSR (Certificate Signing Request) и приватного ключа
# для корпоративного SSL-сертификата (Active Directory CS / PKI)
# ==============================================================================

# Настройки по умолчанию
DOMAIN="${1:-contacts.corporate.loc}"
SERVER_IP="${2:-172.18.128.32}"
COUNTRY="RU"
ORGANIZATION="Corporate"
ORGANIZATION_UNIT="IT Department"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTS_DIR="${PROJECT_ROOT}/certs"
CONFIG_FILE="${CERTS_DIR}/csr.conf"
KEY_FILE="${CERTS_DIR}/key.pem"
CSR_FILE="${CERTS_DIR}/contacts.csr"

mkdir -p "${CERTS_DIR}"

echo "=================================================================="
echo "Генерация CSR для корпоративного SSL-сертификата"
echo "  Домен (FQDN): ${DOMAIN}"
echo "  IP-адрес:     ${SERVER_IP}"
echo "=================================================================="

# 1. Создаем временный конфигурационный файл OpenSSL с поддержкой SAN
cat > "${CONFIG_FILE}" << CONFIG_EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = ${COUNTRY}
O = ${ORGANIZATION}
OU = ${ORGANIZATION_UNIT}
CN = ${DOMAIN}

[req_ext]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = localhost
IP.1 = ${SERVER_IP}
IP.2 = 127.0.0.1
CONFIG_EOF

# 2. Генерируем приватный ключ (RSA 2048) и запрос на сертификат (CSR)
openssl req -new \
    -nodes \
    -newkey rsa:2048 \
    -keyout "${KEY_FILE}" \
    -out "${CSR_FILE}" \
    -config "${CONFIG_FILE}"

# Удаляем временный файл конфигурации
rm -f "${CONFIG_FILE}"

chmod 600 "${KEY_FILE}"
chmod 644 "${CSR_FILE}"

echo ""
echo "✅ Приватный ключ сохранен в: ${KEY_FILE}"
echo "✅ Файл запроса (CSR) создан: ${CSR_FILE}"
echo ""
echo "=================================================================="
echo "СОДЕРЖИМОЕ ЗАПРОСА (CSR) ДЛЯ ОТПРАВКИ В ЦЕНТР СЕРТИФИКАЦИИ (CA):"
echo "=================================================================="
cat "${CSR_FILE}"
echo "=================================================================="
echo ""
echo "СЛЕДУЮЩИЕ ШАГИ:"
echo "1. Скопируйте текст выше (включая BEGIN и END) или передайте файл '${CSR_FILE}'"
echo "   администратору корпоративного CA (или вставьте на https://<ca-server>/certsrv)."
echo "2. Выберите шаблон 'Веб-сервер' (Web Server) и скачайте сертификат в формате Base64."
echo "3. Сохраните полученный сертификат в файл: ${CERTS_DIR}/cert.pem"
echo "4. Перезапустите Nginx: docker compose restart web_frontend"
echo "=================================================================="
