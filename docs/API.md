# Adminyzr — API Documentatie

## Authenticatie

Alle API calls vereisen een Payload JWT token in de `Authorization` header of `payload-token` cookie.

```
Authorization: JWT <token>
```

Login: `POST /api/users/login` met `{ email, password }` body.

---

## REST API (Payload CMS)

Payload CMS biedt automatisch REST endpoints voor alle collections:

| Collection | Endpoint |
|------------|----------|
| Users | `GET/POST /api/users` |
| Organizations | `GET/POST /api/organizations` |
| Clients | `GET/POST /api/clients` |
| Invoices | `GET/POST /api/invoices` |
| Invoice Items | `GET/POST /api/invoice-items` |
| Products | `GET/POST /api/products` |
| Quotes | `GET/POST /api/quotes` |
| Time Entries | `GET/POST /api/time-entries` |
| Punch Cards | `GET/POST /api/punch-cards` |
| Purchase Invoices | `GET/POST /api/purchase-invoices` |
| Attachments | `GET/POST /api/attachments` |
| Audit Log | `GET /api/audit-log` (read-only) |

Elk endpoint ondersteunt:
- `GET /api/{collection}` — Lijst met pagination, filtering, sorting
- `GET /api/{collection}/{id}` — Enkel document
- `POST /api/{collection}` — Aanmaken
- `PATCH /api/{collection}/{id}` — Bijwerken
- `DELETE /api/{collection}/{id}` — Verwijderen

### Query parameters
- `?where[field][operator]=value` — Filteren
- `?sort=field` of `?sort=-field` (descending)
- `?limit=25&page=1` — Pagination
- `?depth=1` — Populate relaties

---

## Custom Endpoints

### PDF Generatie
```
GET /api/invoices/{id}/pdf
```
Genereert en download de factuur als PDF. Wordt ook gecached naar R2 storage.

### BTW Rapport Export
```
GET /api/reports/vat-export?start=2026-01-01&end=2026-03-31
```
Exporteert BTW-rapport als CSV voor de opgegeven periode.

### Betalingsherinneringen (Cron)
```
GET /api/cron/reminders?key={CRON_SECRET}
```
Markeert verlopen facturen als overdue en stuurt herinneringsemails.
Roep dagelijks aan via een cron job.

### Stripe Webhooks
```
POST /api/webhooks/stripe
```
Ontvangt Stripe subscription events.

### Sityzr Webhooks
```
POST /api/webhooks/sityzr
```
Ontvangt Sityzr tenant events (activate/deactivate/update).

---

## Multi-tenancy

Alle queries worden automatisch gefilterd op `organization_id` via Payload access control.
Het is niet mogelijk om cross-tenant data op te vragen via de API.

---

## Rollen & Permissies

| Rol | Lezen | Schrijven | Verwijderen | Gebruikers | Billing |
|-----|-------|-----------|-------------|------------|---------|
| owner | Alles | Alles | Alles | Ja | Ja |
| admin | Alles | Alles | Alles | Ja | Nee |
| accountant | Alles | Facturen, producten, klanten | Nee | Nee | Nee |
| member | Eigen data | Uren, eigen profiel | Nee | Nee | Nee |
| viewer | Alles | Nee | Nee | Nee | Nee |
