#!/bin/sh
set -e

cd /var/www/html

DB_PATH="database/database.sqlite"
SEED_SQL_PATH="database/docker-seed.sql"

if [ ! -f .env ]; then
  if [ -f .env.sqlite ]; then
    cp .env.sqlite .env
  else
    cp .env.example .env
  fi
fi

if ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

mkdir -p database
touch "$DB_PATH"

# Initialize SQLite with bundled production seed on first boot.
if [ -f "$SEED_SQL_PATH" ]; then
  TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
  if [ "$TABLE_COUNT" = "0" ]; then
    echo "Importing initial database data from $SEED_SQL_PATH"
    sqlite3 "$DB_PATH" < "$SEED_SQL_PATH"
  fi
fi

php artisan config:clear
php artisan migrate --force

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
