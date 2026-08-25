<RULE[proxy_security]>
При развертывании и настройке Uvicorn (FastAPI) (в файлах вроде `main.py`), всегда явно указывай IP-адрес(а) или подсеть доверенных прокси-серверов (через параметр `TRUSTED_PROXIES` или список IP, например `127.0.0.1,172.28.10.0/24`) в параметре `trusted_hosts` для `ProxyHeadersMiddleware`. Запрещено использовать `trusted_hosts="*"`, так как это позволяет любому источнику подменять `X-Forwarded-For` и обходить защиту от Brute-Force атак.
</RULE[proxy_security]>
