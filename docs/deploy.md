# Deploying TradeCore to one server

Works on any Linux server with Docker (the design targets an Oracle Cloud Always Free Ubuntu VM).

1. Create the server and open ports 80 and 443 in the provider's firewall. On Oracle Cloud this means the
   VCN security list and also the server's own firewall rules.
2. Install Docker, then clone this repository onto the server.
3. Choose two names that point at the server (a domain, or sslip.io names built from the IP, see `.env.prod.example`).
4. `cp .env.prod.example .env.prod`, fill in every value, and generate the secrets with `openssl rand -hex 32`.
5. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
   The first build takes several minutes because it compiles the C++ engine.
6. Open `https://<APP_DOMAIN>`, register, and place an order.
7. Back up with `PG_CONTAINER=tradecore-postgres-1 ops/backup.sh`, and schedule it with `cron`.

Prices come from a free, unofficial source and may be blocked or rate-limited from a server's address.
Check the watchlist right after the first start.
