#!/usr/bin/env bash
# Dumps the Postgres database into a compressed file and keeps the newest 14.
# Usage: ops/backup.sh   (override PG_CONTAINER, DB_USER, DB_NAME or BACKUP_DIR with environment variables)
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER="${PG_CONTAINER:-paper-trading-postgres}"
DB_USER="${DB_USER:-trading}"
DB_NAME="${DB_NAME:-paper_trading}"
OUT_DIR="${BACKUP_DIR:-backups}"

mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/${DB_NAME}-$(date +%Y%m%d-%H%M%S).sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"

# delete all but the 14 newest
ls -1t "$OUT_DIR"/*.sql.gz | tail -n +15 | xargs -r rm --
