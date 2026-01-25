#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

if [ -z "$DOMAIN" ]; then
  echo "ERROR: DOMAIN is not set"
  echo "Usage: DOMAIN=your.domain EMAIL=you@example.com ./setup.sh"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  echo "ERROR: EMAIL is not set"
  echo "Usage: DOMAIN=your.domain EMAIL=you@example.com ./setup.sh"
  exit 1
fi

mkdir -p ./data/certbot/www ./data/certbot/conf ./data/postgres

echo "==> Starting db, api, nginx..."
docker-compose up -d db api nginx

echo "==> Requesting сертификат..."
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos --no-eff-email

echo "==> Restart nginx..."
docker-compose restart nginx

echo "==> Starting all services..."
docker-compose up -d

echo "==> Done. Check: https://$DOMAIN"
