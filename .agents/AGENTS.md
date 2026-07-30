<RULE[project_deployment]>
При подготовке проекта к деплою в production (или при написании Nginx/Traefik конфигурации) обязательно настраивай SSL (HTTPS) и включай поддержку HTTP/2 для внешних соединений. Внутренний роутинг к Uvicorn оставляй по HTTP/1.1.
</RULE[project_deployment]>

<RULE[proxy_security]>
При развертывании и настройке Uvicorn (FastAPI) (в файлах вроде `main.py`), всегда явно указывай IP-адрес прокси-сервера (в данном случае `10.245.19.85`) в параметре `trusted_hosts` для `ProxyHeadersMiddleware`. Запрещено использовать `trusted_hosts="*"`, так как это позволяет любому источнику подменять `X-Forwarded-For` и обходить защиту от Brute-Force атак.
</RULE[proxy_security]>
