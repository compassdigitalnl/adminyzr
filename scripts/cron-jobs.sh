#!/bin/bash
# Adminyzr Cron Jobs
# Configureer deze in Ploi onder "Cron Jobs" of voeg toe aan crontab.
#
# Ploi configuratie:
#   Commando: bash /home/ploi/adminyzr.compassdigital.nl/scripts/cron-jobs.sh [reminders|subscriptions|all]
#   Schema:   Zie hieronder per job
#
# Handmatig testen:
#   bash scripts/cron-jobs.sh reminders
#   bash scripts/cron-jobs.sh subscriptions
#   bash scripts/cron-jobs.sh all

set -euo pipefail

# Load environment
source /home/ploi/adminyzr.compassdigital.nl/.env 2>/dev/null || true

APP_URL="${NEXT_PUBLIC_APP_URL:-https://adminyzr.compassdigital.nl}"
SECRET="${CRON_SECRET}"

if [ -z "$SECRET" ]; then
  echo "ERROR: CRON_SECRET is niet geconfigureerd in .env"
  exit 1
fi

run_job() {
  local name="$1"
  local url="$2"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running: $name"

  response=$(curl -s -w "\n%{http_code}" --max-time 60 "$url")
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ]; then
    echo "  OK: $body"
  else
    echo "  ERROR (HTTP $http_code): $body"
    return 1
  fi
}

case "${1:-all}" in
  reminders)
    # Betalingsherinneringen — dagelijks om 09:00
    # Ploi schema: 0 9 * * *
    run_job "Betalingsherinneringen" "${APP_URL}/api/cron/reminders?key=${SECRET}"
    ;;
  subscriptions)
    # Abonnementsfacturen — dagelijks om 07:00
    # Ploi schema: 0 7 * * *
    run_job "Abonnementsfacturen" "${APP_URL}/api/cron/subscriptions?key=${SECRET}"
    ;;
  all)
    run_job "Abonnementsfacturen" "${APP_URL}/api/cron/subscriptions?key=${SECRET}"
    run_job "Betalingsherinneringen" "${APP_URL}/api/cron/reminders?key=${SECRET}"
    ;;
  *)
    echo "Usage: $0 [reminders|subscriptions|all]"
    exit 1
    ;;
esac

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done"
