# Adminyzr — Claude Code Instructies

## Stack
- Next.js 15 App Router + Payload CMS 3.x
- PostgreSQL + Drizzle ORM (via Payload)
- TypeScript strict mode
- Tailwind CSS + shadcn/ui
- next-intl voor i18n (NL/EN)

## Conventies
- Alle collections in `/src/payload/collections/`
- Frontend routes in `/src/app/(frontend)/[locale]/`
- Payload admin routes in `/src/app/(payload)/`
- Altijd Zod validatie op inputs
- Tenant ID altijd via middleware/server-side, nooit via client
- Alle bedragen in **centen** (integer) opslaan, niet in euros (float)
- Soft deletes via `deletedAt` timestamp

## Multi-tenancy
- Elke query MOET organization_id bevatten
- Gebruik Payload access control voor tenant isolation
- Nooit cross-tenant queries

## i18n
- Alle UI strings via next-intl `useTranslations()`
- Geen hardcoded Nederlandse tekst in componenten
- Vertalingen in `/messages/nl.json` en `/messages/en.json`

## Security
- Nooit secrets in code, altijd via .env
- Audit log bij elke write operatie
- Soft deletes (deletedAt timestamp)
- Facturen zijn juridische documenten: na versturen NIET meer muteren

## File structuur
```
src/
├── app/
│   ├── (frontend)/[locale]/    # Frontend routes
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   └── (auth)/             # Login, register
│   └── (payload)/              # Payload admin + API
├── payload/collections/        # Payload CMS collections
├── components/                 # Shared UI components
├── lib/                        # Utilities, helpers
├── i18n/                       # i18n config
└── middleware.ts               # Locale + auth middleware
```

## Deployment
- Hetzner via Ploi (geen Vercel)
- Dev port: 3600, Prod port: 3061
- Docker-based deployment
