#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/.deploy.env}"
RUN_SEED=0
SKIP_LOCAL_BUILD=0
SKIP_AUDIT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed)
      RUN_SEED=1
      shift
      ;;
    --skip-local-build)
      SKIP_LOCAL_BUILD=1
      shift
      ;;
    --skip-audit)
      SKIP_AUDIT=1
      shift
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./deploy.sh [options]

Options:
  --seed               Run prisma seed after migrations
  --skip-local-build   Skip local build validation
  --skip-audit         Skip npm vulnerability audit
  --env-file <path>    Use a custom deploy env file
  -h, --help           Show this help

Setup:
  1. Copy deploy.env.example to .deploy.env
  2. Fill in your server/app/database values
  3. Run ./deploy.sh

Notes:
  - Uses SSH keys by default. If you set DEPLOY_PASSWORD, it will use sshpass.
  - Safe to rerun. Provisioning and service setup are idempotent.
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

if [[ ! -f "$ENV_FILE" ]]; then
  cat >&2 <<EOF
Missing deploy env file: $ENV_FILE

Create it from the example first:
  cp deploy.env.example .deploy.env
EOF
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:=root}"
: "${APP_DIR:=/opt/restaurant-latest}"
: "${APP_SYSTEM_USER:=restaurantapp}"
: "${APP_SERVER_NAME:=$DEPLOY_HOST}"
: "${APP_URL:?APP_URL is required}"
: "${NEXT_PORT:=3000}"
: "${WS_PORT:=3001}"
: "${DATABASE_NAME:=restaurant_latest}"
: "${DATABASE_USER:=restaurantapp}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"
: "${SESSION_SECRET:?SESSION_SECRET is required}"
: "${NEXT_SERVICE_NAME:=restaurant-next}"
: "${WS_SERVICE_NAME:=restaurant-ws}"
: "${NGINX_SITE_NAME:=restaurant-latest}"
: "${NODE_MAJOR:=22}"
: "${AUDIT_LEVEL:=high}"
: "${AUDIT_PRODUCTION_ONLY:=1}"

if [[ "${#SESSION_SECRET}" -lt 32 ]]; then
  die "SESSION_SECRET must be at least 32 characters"
fi

require_cmd ssh
require_cmd rsync
require_cmd curl
require_cmd npm

if [[ -n "${DEPLOY_PASSWORD:-}" ]]; then
  require_cmd sshpass
  SSH_BASE=(sshpass -p "$DEPLOY_PASSWORD" ssh)
  RSYNC_BASE=(sshpass -p "$DEPLOY_PASSWORD" rsync)
else
  SSH_BASE=(ssh)
  RSYNC_BASE=(rsync)
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

remote() {
  "${SSH_BASE[@]}" "${SSH_OPTS[@]}" "$REMOTE" "$@"
}

rsync_to_remote() {
  "${RSYNC_BASE[@]}" -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '.deploy.env' \
    --exclude 'tsconfig.tsbuildinfo' \
    --exclude 'public/uploads' \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT_DIR/" "$REMOTE:$APP_DIR/"
}

APP_URL_NO_SCHEME="${APP_URL#http://}"
APP_URL_NO_SCHEME="${APP_URL_NO_SCHEME#https://}"
APP_URL_NO_SCHEME="${APP_URL_NO_SCHEME%/}"

if [[ "$APP_URL" == https://* ]]; then
  PUBLIC_WS_URL="wss://${APP_URL_NO_SCHEME}/realtime"
else
  PUBLIC_WS_URL="ws://${APP_URL_NO_SCHEME}/realtime"
fi

DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:5432/${DATABASE_NAME}?schema=public"

log "Checking local build"
if [[ "$SKIP_LOCAL_BUILD" -eq 0 && -f "$ROOT_DIR/.env" ]]; then
  (cd "$ROOT_DIR" && npm run build)
elif [[ "$SKIP_LOCAL_BUILD" -eq 0 ]]; then
  log "Skipping local build because .env is missing"
else
  log "Skipping local build by request"
fi

log "Checking dependency vulnerabilities"
if [[ "$SKIP_AUDIT" -eq 0 ]]; then
  AUDIT_ARGS=(audit "--audit-level=${AUDIT_LEVEL}")
  if [[ "$AUDIT_PRODUCTION_ONLY" == "1" ]]; then
    AUDIT_ARGS+=(--omit=dev)
  fi
  (cd "$ROOT_DIR" && npm "${AUDIT_ARGS[@]}")
else
  log "Skipping npm audit by request"
fi

log "Provisioning remote server"
remote 'bash -s' <<EOF
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl ca-certificates gnupg nginx postgresql postgresql-contrib build-essential rsync

if ! command -v node >/dev/null 2>&1; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi

systemctl enable --now postgresql
systemctl enable --now nginx

id -u ${APP_SYSTEM_USER} >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash ${APP_SYSTEM_USER}
mkdir -p ${APP_DIR}
chown -R ${APP_SYSTEM_USER}:${APP_SYSTEM_USER} ${APP_DIR}

runuser -u postgres -- psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${DATABASE_USER}'" | grep -q 1 || \
  runuser -u postgres -- psql -c "CREATE USER ${DATABASE_USER} WITH PASSWORD '${DATABASE_PASSWORD}';"

runuser -u postgres -- psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DATABASE_NAME}'" | grep -q 1 || \
  runuser -u postgres -- psql -c "CREATE DATABASE ${DATABASE_NAME} OWNER ${DATABASE_USER};"
EOF

log "Syncing project files"
rsync_to_remote

log "Writing remote environment and service config"
remote \
  "APP_DIR='${APP_DIR}'" \
  "APP_SYSTEM_USER='${APP_SYSTEM_USER}'" \
  "DATABASE_URL='${DATABASE_URL}'" \
  "SESSION_SECRET='${SESSION_SECRET}'" \
  "WS_PORT='${WS_PORT}'" \
  "PUBLIC_WS_URL='${PUBLIC_WS_URL}'" \
  "APP_URL='${APP_URL}'" \
  "NEXT_SERVICE_NAME='${NEXT_SERVICE_NAME}'" \
  "WS_SERVICE_NAME='${WS_SERVICE_NAME}'" \
  "NEXT_PORT='${NEXT_PORT}'" \
  "NGINX_SITE_NAME='${NGINX_SITE_NAME}'" \
  "APP_SERVER_NAME='${APP_SERVER_NAME}'" \
  'bash -s' <<'EOF'
set -euo pipefail

cat > ${APP_DIR}/.env.production <<ENVVARS
DATABASE_URL="${DATABASE_URL}"
SESSION_SECRET="${SESSION_SECRET}"
WS_HUB_URL="ws://127.0.0.1:${WS_PORT}/realtime"
NEXT_PUBLIC_WS_HUB_URL="${PUBLIC_WS_URL}"
NEXT_PUBLIC_APP_URL="${APP_URL}"
NODE_ENV="production"
ENVVARS

chown -R ${APP_SYSTEM_USER}:${APP_SYSTEM_USER} ${APP_DIR}

cat > /etc/systemd/system/${NEXT_SERVICE_NAME}.service <<SERVICE
[Unit]
Description=Next.js app (${NEXT_SERVICE_NAME})
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_SYSTEM_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.production
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port ${NEXT_PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/systemd/system/${WS_SERVICE_NAME}.service <<SERVICE
[Unit]
Description=WebSocket hub (${WS_SERVICE_NAME})
After=network.target

[Service]
Type=simple
User=${APP_SYSTEM_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.production
ExecStart=/usr/bin/npx tsx ws/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/nginx/sites-available/${NGINX_SITE_NAME} <<NGINX
server {
    listen 80;
    server_name ${APP_SERVER_NAME};

    # Serve runtime uploads from disk. next start only serves public/
    # files that existed when the process started, so new menu/branding
    # images would 404 if proxied through Next.js.
    location /uploads/ {
        root ${APP_DIR}/public;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    location /realtime {
        proxy_pass http://127.0.0.1:${WS_PORT}/realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:${NEXT_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}
NGINX

python3 - <<'PY'
from pathlib import Path
path = Path('/etc/nginx/nginx.conf')
text = path.read_text()
needle = 'http {\n'
insert = 'http {\n    map $http_upgrade $connection_upgrade {\n        default upgrade;\n        ""      close;\n    }\n'
if 'map $http_upgrade $connection_upgrade' not in text:
    text = text.replace(needle, insert, 1)
    path.write_text(text)
PY

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/${NGINX_SITE_NAME} /etc/nginx/sites-enabled/${NGINX_SITE_NAME}
nginx -t
systemctl daemon-reload
EOF

log "Installing dependencies, migrating, building, and restarting services"
remote 'bash -s' <<EOF
set -euo pipefail

su -s /bin/bash -c 'cd ${APP_DIR} && npm ci' ${APP_SYSTEM_USER}
su -s /bin/bash -c 'cd ${APP_DIR} && set -a && source .env.production && set +a && npx prisma migrate deploy' ${APP_SYSTEM_USER}
if [[ "${RUN_SEED}" == "1" ]]; then
  su -s /bin/bash -c 'cd ${APP_DIR} && set -a && source .env.production && set +a && npx prisma db seed' ${APP_SYSTEM_USER}
fi
su -s /bin/bash -c 'cd ${APP_DIR} && set -a && source .env.production && set +a && npm run build' ${APP_SYSTEM_USER}

systemctl enable --now ${NEXT_SERVICE_NAME} ${WS_SERVICE_NAME}
systemctl restart ${NEXT_SERVICE_NAME} ${WS_SERVICE_NAME}
systemctl reload nginx
EOF

log "Running health checks"
curl -fsS "${APP_URL}" >/dev/null
remote "curl -fsS http://127.0.0.1:${WS_PORT}/health >/dev/null"

log "Deployment complete"
cat <<EOF

App URL: ${APP_URL}
Platform login: ${APP_URL}/platform/login

Useful flags:
  ./deploy.sh --seed
  ./deploy.sh --skip-local-build
  ./deploy.sh --skip-audit

Useful remote services:
  ${NEXT_SERVICE_NAME}
  ${WS_SERVICE_NAME}
EOF
