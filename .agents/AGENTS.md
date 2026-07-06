<RULE[project_deployment]>
При подготовке проекта к деплою в production (или при написании Nginx/Traefik конфигурации) обязательно настраивай SSL (HTTPS) и включай поддержку HTTP/2 для внешних соединений. Внутренний роутинг к Uvicorn оставляй по HTTP/1.1.
</RULE[project_deployment]>
