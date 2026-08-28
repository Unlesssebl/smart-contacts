# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# openssl нужен для генерации fallback-сертификатов при первом запуске
RUN apk add --no-cache openssl

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Скрипт автоматически генерирует самоподписанные SSL-сертификаты,
# если корпоративные не были смонтированы в ./certs
COPY 10-generate-certs.sh /docker-entrypoint.d/10-generate-certs.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/10-generate-certs.sh && chmod +x /docker-entrypoint.d/10-generate-certs.sh

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
