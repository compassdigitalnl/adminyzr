# Adminyzr — Deployment Guide

## Vereisten

- Node.js >= 18.17
- PostgreSQL 16
- Cloudflare R2 account (of S3-compatible storage)
- SMTP server (Amazon SES of andere)
- Git + GitHub

## Lokale ontwikkeling

```bash
# 1. Start database
docker compose -f docker-compose.dev.yml up -d

# 2. Installeer dependencies
npm install

# 3. Kopieer .env
cp .env.example .env
# Vul de juiste waarden in

# 4. Start dev server
npm run dev
# Open http://localhost:3600
```

## Productie (Docker)

```bash
# 1. Build & start
docker compose up -d --build

# 2. Check status
docker compose ps
docker compose logs -f app
```

De app draait op port 3061.

## Productie (Ploi / Hetzner)

### Server setup
1. Maak een server aan op Hetzner (CX31: 4 vCPU, 8GB RAM)
2. Koppel de server aan Ploi
3. Installeer Node.js 20, PostgreSQL 16, en Nginx via Ploi

### Environment variables
Stel in via Ploi > Site > Environment:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/adminyzr
PAYLOAD_SECRET=<random-64-char-string>
NEXT_PUBLIC_APP_URL=https://adminyzr.io

# Cloudflare R2
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=adminyzr-documents
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_REGION=auto

# Email (SMTP)
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<ses-user>
SMTP_PASS=<ses-pass>
MAIL_FROM=noreply@adminyzr.io

# Cron
CRON_SECRET=<random-string>

# Sentry
SENTRY_DSN=<dsn-url>
NEXT_PUBLIC_SENTRY_DSN=<dsn-url>
```

### Deploy via GitHub Actions
1. Ga naar GitHub > Repository > Settings > Secrets
2. Voeg toe: `PLOI_WEBHOOK_URL` (te vinden in Ploi > Site > Deployment)
3. Push naar `main` — CI/CD pipeline runt automatisch

### Cron jobs
Stel in via Ploi > Server > Cron Jobs:

```
# Abonnementsfacturen — dagelijks om 7:00
0 7 * * * bash /home/ploi/adminyzr.compassdigital.nl/scripts/cron-jobs.sh subscriptions

# Betalingsherinneringen — dagelijks om 9:00
0 9 * * * bash /home/ploi/adminyzr.compassdigital.nl/scripts/cron-jobs.sh reminders
```

Zie `docs/SETUP.md` voor volledige configuratie-instructies.

### Reverse proxy (Nginx)
Ploi configureert Nginx automatisch. Zorg dat de site wijst naar port 3061.

### SSL
Ploi regelt Let's Encrypt certificaten automatisch.

## Database migraties

Payload CMS beheert het database schema automatisch. Bij de eerste start worden alle tabellen aangemaakt.

```bash
# Handmatig types genereren
npm run generate:types
```

## Monitoring

- **Sentry**: Errors worden automatisch gerapporteerd
- **Payload Admin**: Beschikbaar op `/admin`
- **Audit Log**: Alle mutaties worden gelogd in de `audit-log` collection
