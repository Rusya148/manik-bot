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

mkdir -p ./data/certbot/www ./data/certbot/conf ./data/postgres ./nginx/conf.d

cat > ./nginx/conf.d/app.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://api:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "==> Starting db, api, nginx (HTTP only)..."
docker-compose up -d db api nginx

echo "==> Requesting сертификат..."
docker-compose run --rm --entrypoint "" certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos --no-eff-email

cat > ./nginx/conf.d/app.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://api:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "==> Restart nginx with SSL..."
docker-compose restart nginx

echo "==> Starting all services..."
docker-compose up -d

echo "==> Done. Check: https://$DOMAIN"
