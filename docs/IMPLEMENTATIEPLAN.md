# Adminyzr — Implementatieplan v1.0
> Business Operations Platform · SaaS-ready · Payload CMS Native

---

## 1. Productvisie

**Adminyzr** is een full-stack bedrijfsbeheersysteem gebouwd op de Payload CMS + Next.js stack, volledig multi-tenant en SaaS-ready. Het vervangt WeFact, Exact (deels), Mac Mail (voor zakelijke communicatie), en de WP Control Room strippenkaarten — én het integreert naadloos met Sityzr als white-label module.

### Naamgeving
Consistent met de productfamilie: `adminyzr.io` (of als module: `admin.sityzr.com`)

### Kernprincipes
- **Payload CMS native** — geen losse microservices, alles in één codebase
- **Multi-tenant van dag 1** — elke tenant heeft eigen data, branding, domeinen
- **API-first** — alles via REST/GraphQL, integreerbaar met Sityzr
- **Geen Vercel** — Hetzner via Ploi, Docker-based deployment
- **GDPR-compliant** — data residency EU, audit logs, soft deletes

---

## 2. Feature Scope

### 2.1 MVP (Fase 1)
| Module | Functie | Vervangt |
|--------|---------|----------|
| **Facturatie** | Verkoopfacturen, PDF, BTW, herinneringen | WeFact |
| **Inkoopfacturen** | Upload, OCR-herkenning, goedkeuring | Exact |
| **CRM** | Contacten, bedrijven, notities, geschiedenis | – |
| **Strippenkaarten** | Uren/credits per klant, afboeken, alerts | WP Control Room |
| **Urenregistratie** | Tijdregistratie per project/klant | Toggl |
| **Offertes** | Offerte → Factuur workflow | WeFact |

### 2.2 Fase 2
| Module | Functie |
|--------|---------|
| **E-mail** | Transactionele mail, klantcommunicatie log |
| **Projecten** | Kanban, milestones, koppeling aan facturatie |
| **Abonnementen/MRR** | Recurring billing, dunning, upgrades |
| **Rapportage** | BTW-aangifte export, omzet dashboards, cashflow |
| **Portaal** | Klantportaal: facturen inzien, offertes accorderen |

### 2.3 Fase 3 (optioneel/SaaS uitbreiding)
| Module | Functie |
|--------|---------|
| **Salarisadministratie** | Loonstroken, loonjournaal, koppeling Belastingdienst |
| **Personeelsbeheer** | Contracten, verlof, onboarding |
| **Boekhoudkoppeling** | Export naar Snelstart, Twinfield, of eigen grootboek |
| **Sityzr integratie** | White-label module binnen Sityzr tenants |

---

## 3. Technische Architectuur

### 3.1 Stack
```
Frontend:     Next.js 15 (App Router)
CMS/Backend:  Payload CMS 3.x (native Next.js)
Database:     PostgreSQL (Neon of Hetzner managed)
ORM:          Drizzle (Payload native) of Prisma
Cache:        Redis (Upstash of self-hosted)
Queue:        BullMQ (jobs: PDF generatie, mail, OCR)
Storage:      Cloudflare R2 (facturen, bijlagen)
Mail:         Amazon SES (transactioneel) + IMAP bridge
OCR:          AWS Textract of Google Document AI
Auth:         Payload Auth (JWT + refresh tokens)
i18n:         next-intl
Monitoring:   Sentry (errors) + Axiom (logs)
Infra:        Hetzner via Ploi, Docker Compose
CI/CD:        GitHub Actions → Ploi webhook deploy
```

### 3.2 Multi-tenancy Model
```
Strategie: Database-per-tenant (veiligst) OF Row-level security (schaalbaarder)
Aanbeveling: RLS met PostgreSQL schema isolation per tenant

Tenant → Organization
  ├── Users (met rollen: owner, admin, accountant, viewer)
  ├── Clients
  ├── Invoices
  ├── Projects
  └── Settings (branding, BTW-nummers, IBAN, etc.)
```

### 3.3 Payload CMS Collections
```typescript
// Core collections
- Organizations          // Tenants
- Users                  // Auth, rollen, tenant-koppeling
- Clients                // CRM: bedrijven + contactpersonen
- Invoices               // Verkoopfacturen
- PurchaseInvoices       // Inkoopfacturen
- Quotes                 // Offertes
- TimeEntries            // Urenregistratie
- PunchCards             // Strippenkaarten
- Products               // Diensten/producten catalogus
- TaxRates               // BTW-tarieven (21%, 9%, 0%)
- PaymentTerms           // Betalingstermijnen

// Media
- Attachments            // R2-backed uploads
- InvoiceTemplates       // PDF-templates per tenant

// System
- AuditLog               // Alle mutaties
- EmailLog               // Verstuurde mails
- WebhookLog             // Inkomende/uitgaande webhooks
```

### 3.4 Factuurherkenning (OCR)
```
Flow inkoopfactuur:
1. Upload PDF/afbeelding → R2 storage
2. BullMQ job: stuur naar AWS Textract
3. Textract → gestructureerde data (leverancier, datum, bedrag, BTW, IBAN)
4. Confidence score check:
   - > 90%: auto-fill formulier, menselijke goedkeuring
   - 60-90%: suggesties tonen, handmatige review
   - < 60%: handmatige invoer, OCR als hint
5. Matching: leverancier tegen CRM, BTW-nummer validatie
6. Goedkeuringsflow: notificatie naar eigenaar/accountant

Alternatief voor MVP: Mindee API (goedkoper, sneller te integreren)
```

---

## 4. Authenticatie & Autorisatie

### 4.1 Auth Stack
```
- Payload CMS ingebouwde auth (JWT access + refresh tokens)
- Magic link login (geen wachtwoord nodig voor klantportaal)
- 2FA via TOTP (Google Authenticator)
- SSO via OAuth2 (Google, Microsoft) — fase 2
- API keys voor machine-to-machine (Sityzr integratie)
```

### 4.2 Rollen & Permissies
```
owner       → alles, incl. billing en gebruikersbeheer
admin       → alles behalve billing
accountant  → facturen, inkoopfacturen, rapporten (read/write)
medewerker  → urenregistratie, eigen projecten
viewer      → read-only
client      → klantportaal (eigen facturen/offertes)
```

---

## 5. Internationalisation (i18n)

```
Library:    next-intl
Locales:    nl (default), en, de, fr
Strategie:  URL-based (/nl/dashboard, /en/dashboard)

Scope:
- UI strings (next-intl JSON bestanden)
- Factuurtemplate taal per klant instelbaar
- Datumnotaties, valuta, BTW-regels per land
- E-mail templates per taal

Structuur:
/messages
  nl.json
  en.json
  de.json
  fr.json
```

---

## 6. Storage

```
Provider:   Cloudflare R2 (S3-compatible, geen egress kosten)
SDK:        @aws-sdk/client-s3

Buckets:
- adminyzr-documents    → facturen, inkoopfacturen, offertes (PDF)
- adminyzr-attachments  → e-mailbijlagen, uploads
- adminyzr-exports      → BTW-exports, rapportages
- adminyzr-templates    → PDF-templates per tenant

Payload integratie:
- @payloadcms/storage-s3 plugin
- Signed URLs voor beveiligde downloads (24h expiry)
- Automatische cleanup van tijdelijke bestanden
```

---

## 7. PDF Generatie

```
Library:    @react-pdf/renderer of Puppeteer (headless Chrome)
Aanbeveling: Puppeteer via BullMQ worker (meer flexibiliteit in design)

Flow:
1. Factuur aangemaakt/gewijzigd
2. BullMQ job: genereer PDF
3. Puppeteer rendert Next.js route /api/pdf/invoice/[id]
4. PDF opgeslagen in R2
5. Signed URL teruggegeven aan frontend

Templates:
- Per tenant aanpasbaar (logo, kleuren, adresblok)
- Meerdere talen (NL/EN)
- Automatische nummering (2024-0001)
- QR-code voor betaallink (Mollie/SEPA)
```

---

## 8. E-mail

```
Transactioneel:   Amazon SES (eu-central-1)
Tracking:         SES events via SNS → webhook → EmailLog collection
Templates:        React Email (JSX-based templates)

Flows:
- Factuur versturen (PDF bijlage)
- Betalingsherinnering (dag 1, 7, 14 na vervaldatum)
- Offerte verstuurd/geaccepteerd
- Nieuw klantportaal account
- Strippenkaart bijna op (bijv. < 20% resterend)
- Maandelijkse samenvatting
```

---

## 9. Beveiliging

```
Transport:
- HTTPS everywhere (Let's Encrypt via Caddy)
- HSTS, CSP headers
- Rate limiting op auth endpoints (Redis)

Data:
- Payload RLS: tenant isolation op databaseniveau
- Soft deletes (geen data permanent weg)
- Audit log: elke mutatie gelogd (wie, wat, wanneer)
- Encryptie at rest: Hetzner disk encryption + R2

API:
- API keys hashed opgeslagen (bcrypt)
- JWT short-lived (15 min access, 7 dagen refresh)
- CORS whitelist per tenant

Compliance:
- GDPR: data export, verwijderrecht, verwerkersovereenkomst
- BTW-wet: facturen onveranderbaar na versturen (log-only)
- AVG-proof logging (geen PII in logs)
```

---

## 10. Monitoring & Observability

```
Errors:       Sentry (frontend + backend, per environment)
Logs:         Axiom of Logtail (structured JSON logs)
Uptime:       Better Uptime of Hyperping
Performance:  Vercel Analytics alternatief: Plausible (self-hosted)
DB:           pg_stat_statements, slow query log
Queue:        BullMQ Board (web UI voor job monitoring)

Alerts:
- Sentry: error spike → Slack/e-mail
- Better Uptime: downtime → SMS/Slack
- BullMQ: failed jobs → Slack
- Betaalfalen (dunning) → e-mail naar owner
```

---

## 11. Infrastructuur & Deployment

### 11.1 Servers (Hetzner via Ploi)
```
Production:
- app-adminyzr-01     CX31 (4 vCPU, 8GB) → Next.js + Payload
- db-adminyzr-01      CPX21 (3 vCPU, 4GB) → PostgreSQL
- redis-adminyzr-01   CX11 (2 vCPU, 2GB) → Redis + BullMQ

Staging:
- staging-adminyzr-01 CX21 (2 vCPU, 4GB) → alles in één

DNS:
- adminyzr.io → Cloudflare (proxy + DDoS)
- *.adminyzr.io → tenant subdomains
- Reverse proxy: Caddy
```

### 11.2 Docker Compose (productie)
```yaml
services:
  app:
    build: .
    environment:
      - DATABASE_URL
      - REDIS_URL
      - PAYLOAD_SECRET
      - S3_BUCKET / R2_ACCOUNT_ID
      - SENTRY_DSN
    depends_on: [postgres, redis]

  worker:
    build: .
    command: node dist/worker.js
    # BullMQ workers: PDF, OCR, mail

  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
```

### 11.3 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - lint (ESLint + TypeScript)
    - unit tests (Vitest)
    - e2e tests (Playwright) — kritieke flows

  deploy:
    - Docker build + push to GitHub Container Registry
    - Ploi webhook trigger → pull + restart
    - Sentry release tagging
    - Smoke test na deploy
```

---

## 12. GitHub Project Structuur

### 12.1 Repository
```
adminyzr/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/            # Dashboard routes
│   │   ├── (auth)/             # Login, register
│   │   ├── (portal)/           # Klantportaal
│   │   └── api/                # API routes + webhooks
│   ├── payload/
│   │   ├── collections/        # Payload collections
│   │   ├── globals/            # Payload globals (settings)
│   │   └── plugins/            # Custom Payload plugins
│   ├── components/             # Shared UI components
│   ├── lib/                    # Utilities, helpers
│   ├── workers/                # BullMQ workers
│   ├── emails/                 # React Email templates
│   └── i18n/                   # next-intl config + messages
├── messages/                   # i18n JSON bestanden
├── tests/                      # Vitest + Playwright
├── docker/                     # Dockerfiles
├── .github/
│   ├── workflows/              # CI/CD
│   └── ISSUE_TEMPLATE/         # Bug, feature, task templates
├── CLAUDE.md                   # Claude Code instructies
├── IMPLEMENTATIEPLAN.md        # Dit document
└── docker-compose.yml
```

### 12.2 GitHub Issues Labels
```
type: feature      → nieuwe functionaliteit
type: bug          → bug fix
type: security     → beveiligingsissue (private)
type: performance  → optimalisatie
type: docs         → documentatie

module: facturatie
module: crm
module: urenregistratie
module: ocr
module: auth
module: i18n
module: infra

priority: critical
priority: high
priority: medium
priority: low

status: in-progress
status: blocked
status: review
```

### 12.3 GitHub Milestones
```
v0.1 — Foundation         Auth, multi-tenancy, basis CRUD
v0.2 — Facturatie MVP     Verkoopfacturen, PDF, mail
v0.3 — CRM + Stripkaarten Contacten, urenregistratie
v0.4 — Inkoopfacturen     Upload, OCR, goedkeuring
v0.5 — Offertes           Offerte → Factuur workflow
v1.0 — Launch             Productierijp, i18n NL/EN
v1.1 — Klantportaal       Self-service voor klanten
v1.2 — Rapportage         BTW-export, dashboards
v2.0 — SaaS Launch        Publieke onboarding, Sityzr integratie
```

---

## 13. CLAUDE.md Structuur

```markdown
# Adminyzr — Claude Code Instructies

## Stack
- Next.js 15 App Router + Payload CMS 3.x
- PostgreSQL + Drizzle ORM
- TypeScript strict mode
- Tailwind CSS + shadcn/ui

## Conventies
- Alle collections in /src/payload/collections/
- Server actions voor forms (geen API routes voor CRUD)
- BullMQ voor alle async taken (PDF, mail, OCR)
- Altijd Zod validatie op inputs
- Tenant ID altijd via middleware, nooit via client

## Multi-tenancy
- Elke query MOET tenant_id bevatten
- Gebruik `getCurrentTenant()` helper uit /src/lib/tenant.ts
- Nooit cross-tenant queries

## i18n
- Alle UI strings via next-intl `useTranslations()`
- Geen hardcoded Nederlandse tekst in componenten

## Security
- Nooit secrets in code, altijd via .env
- Audit log bij elke write operatie
- Soft deletes (deleted_at timestamp)
```

---

## 14. Fasering & Planning

### Fase 1 — Foundation (4 weken)
- [ ] Repo setup, Docker, CI/CD pipeline
- [ ] Payload CMS configuratie + PostgreSQL
- [ ] Multi-tenancy implementatie (RLS)
- [ ] Auth: login, 2FA, rollen
- [ ] Basis UI: dashboard shell, navigatie
- [ ] i18n setup (NL + EN)
- [ ] Sentry + monitoring

### Fase 2 — Facturatie MVP (3 weken)
- [ ] Klanten/contacten (CRM basis)
- [ ] Producten/diensten catalogus
- [ ] Verkoopfacturen CRUD
- [ ] PDF generatie (Puppeteer)
- [ ] R2 storage integratie
- [ ] Factuur versturen via SES
- [ ] Betalingsherinneringen (BullMQ)

### Fase 3 — Uitbreiding (4 weken)
- [ ] Inkoopfacturen + OCR (Mindee/Textract)
- [ ] Offertes → Factuur workflow
- [ ] Urenregistratie
- [ ] Strippenkaarten
- [ ] BTW-rapportage export

### Fase 4 — SaaS Ready (3 weken)
- [ ] Klantportaal
- [ ] Publieke onboarding flow
- [ ] Stripe billing voor Adminyzr zelf
- [ ] Sityzr white-label integratie
- [ ] Documentatie

---

## 15. Aandachtspunten

1. **BTW-wetgeving**: Facturen zijn juridische documenten — na versturen niet meer muteren, wel creditnota's
2. **IBAN-validatie**: Valideer IBAN bij inkoopfacturen (phishing preventie)
3. **Boekhoudkoppeling**: BTW-export moet aansluiten op wat accountant nodig heeft (vraag dit na)
4. **OCR nauwkeurigheid**: Altijd menselijke review voor inkoopfacturen boven X bedrag
5. **Strippenkaarten**: Definieer eenheden (uren, credits, taken) — flexibel houden
6. **Salarisadministratie**: Zeer complex (loonheffing, pensioen, Belastingdienst koppeling) — als aparte module of via integratie met externe partij (Nmbrs API)

---

*Gegenereerd voor Compass Digital · Mark Kokkelkoren · v1.0*
