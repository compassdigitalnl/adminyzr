# Adminyzr — Setup & Configuratie

Checklist voor het opzetten van een productie-omgeving.

## 1. Environment Variables (.env)

### Verplicht

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/adminyzr

# Payload CMS
PAYLOAD_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=https://adminyzr.compassdigital.nl

# Cron secret (voor automatische taken)
CRON_SECRET=<openssl rand -hex 16>
```

### E-mail (SMTP)

Nodig voor: factuurverzending, betalingsherinneringen, offertes.

```env
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<ses-user>
SMTP_PASS=<ses-pass>
MAIL_FROM=noreply@adminyzr.io
```

### Bestandsopslag (S3 / Cloudflare R2)

Nodig voor: uploads, bijlagen, PDF-documenten.

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=adminyzr-documents
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_REGION=auto
```

### Betaalproviders

API keys worden versleuteld in de database opgeslagen. De encryptiesleutel:

```env
# Genereer met: openssl rand -hex 32
PAYMENT_KEY_ENCRYPTION_SECRET=<64-char-hex-string>
```

Na het instellen configureer je providers via:
**Instellingen → Betalingen → Provider toevoegen**

Webhook URLs (configureer in het dashboard van de provider):
- **Mollie**: `https://adminyzr.compassdigital.nl/api/webhooks/payments/mollie`
- **Stripe**: `https://adminyzr.compassdigital.nl/api/webhooks/payments/stripe`
- **MultiSafePay**: `https://adminyzr.compassdigital.nl/api/webhooks/payments/multisafepay`

### Stripe (SaaS abonnementen)

Nodig voor: Adminyzr SaaS billing (niet voor klantfacturen — dat gaat via Betalingen).

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Webhook URL: `https://adminyzr.compassdigital.nl/api/webhooks/stripe`

### Sityzr integratie

Nodig voor: e-commerce orders synchroniseren vanuit Sityzr CMS.

```env
SITYZR_API_URL=https://api.sityzr.com
SITYZR_API_KEY=<key>
SITYZR_WEBHOOK_SECRET=<secret>
```

Webhook URL: `https://adminyzr.compassdigital.nl/api/webhooks/sityzr`

### OCR (factuurherkenning)

Nodig voor: automatisch inkoopfacturen uitlezen.

```env
MINDEE_API_KEY=<mindee-api-key>
```

### Monitoring (optioneel)

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Redis (optioneel, voor job queue)

```env
REDIS_URL=redis://localhost:6379
```

---

## 2. Cron Jobs

Configureer in **Ploi → Server → Cron Jobs**:

| Schema | Commando | Doel |
|--------|----------|------|
| `0 7 * * *` | `bash /home/ploi/adminyzr.compassdigital.nl/scripts/cron-jobs.sh subscriptions` | Abonnementsfacturen genereren |
| `0 9 * * *` | `bash /home/ploi/adminyzr.compassdigital.nl/scripts/cron-jobs.sh reminders` | Betalingsherinneringen versturen |

Of beide tegelijk: `bash /home/ploi/adminyzr.compassdigital.nl/scripts/cron-jobs.sh all`

**Handmatig testen:**
```bash
bash scripts/cron-jobs.sh reminders
bash scripts/cron-jobs.sh subscriptions
```

---

## 3. Database

Payload CMS beheert het schema automatisch (`push: true`).

Bij nieuwe collections die niet automatisch aangemaakt worden:
```bash
# Check via de push-schema endpoint
curl "https://adminyzr.compassdigital.nl/api/admin/push-schema?secret=<CRON_SECRET>"
```

---

## 4. PM2 (Process Manager)

```bash
# Status
pm2 status

# Herstart na deploy
pm2 restart adminyzr

# Logs bekijken
pm2 logs adminyzr --lines 50

# Logs wissen
pm2 flush adminyzr
```

---

## 5. Configuratie checklist

- [ ] `.env` ingevuld met alle verplichte variabelen
- [ ] `PAYMENT_KEY_ENCRYPTION_SECRET` gegenereerd (`openssl rand -hex 32`)
- [ ] SMTP geconfigureerd en getest (factuur versturen)
- [ ] S3/R2 storage geconfigureerd (bijlage uploaden)
- [ ] Cron jobs geconfigureerd in Ploi (2 jobs)
- [ ] Betaalprovider toegevoegd via Instellingen → Betalingen
- [ ] Webhook URLs geconfigureerd bij de betaalprovider
- [ ] Stripe SaaS billing geconfigureerd (indien multi-tenant)
- [ ] SSL certificaat actief (Ploi/Let's Encrypt)
- [ ] Sentry monitoring geconfigureerd (optioneel)
