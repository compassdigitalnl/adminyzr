'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Props = {
  translations: {
    title: string
  }
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${colors[method] || 'bg-gray-100 text-gray-800'}`}>
      {method}
    </span>
  )
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      {language && (
        <div className="absolute top-0 left-0 rounded-tl rounded-br bg-muted-foreground/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-muted-foreground/10 hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  )
}

function ParamTable({ params }: { params: Array<{ name: string; type: string; required: boolean; description: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium">Parameter</th>
            <th className="text-left py-2 pr-4 font-medium">Type</th>
            <th className="text-left py-2 pr-4 font-medium">Required</th>
            <th className="text-left py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b last:border-0">
              <td className="py-2 pr-4">
                <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">{p.name}</code>
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{p.type}</td>
              <td className="py-2 pr-4">
                {p.required ? (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Optional</span>
                )}
              </td>
              <td className="py-2 text-muted-foreground">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EndpointSection({
  method,
  path,
  title,
  description,
  auth,
  params,
  curlExample,
  responseExample,
}: {
  method: string
  path: string
  title: string
  description: string
  auth: string
  params?: Array<{ name: string; type: string; required: boolean; description: string }>
  curlExample: string
  responseExample: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <MethodBadge method={method} />
        <code className="text-sm font-mono">{path}</code>
        <span className="text-sm text-muted-foreground ml-auto hidden sm:inline">{title}</span>
      </button>
      {isOpen && (
        <div className="border-t p-4 space-y-4">
          <div>
            <h4 className="font-medium mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Authentication</span>
            <p className="text-sm mt-1">{auth}</p>
          </div>

          {params && params.length > 0 && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parameters</span>
              <div className="mt-2">
                <ParamTable params={params} />
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example request</span>
            <div className="mt-2">
              <CodeBlock language="bash">{curlExample}</CodeBlock>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example response</span>
            <div className="mt-2">
              <CodeBlock language="json">{responseExample}</CodeBlock>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ApiDocsClient({ translations }: Props) {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="./settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{translations.title}</h1>
        <p className="text-muted-foreground mt-1">
          Reference documentation for the Adminyzr REST API. Use these endpoints to integrate with external systems.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Contents</h2>
        <ul className="space-y-1 text-sm">
          <li><a href="#authentication" className="text-primary hover:underline">Authentication</a></li>
          <li><a href="#endpoints" className="text-primary hover:underline">API Endpoints</a></li>
          <li><a href="#webhooks" className="text-primary hover:underline">Webhooks</a></li>
          <li><a href="#cron" className="text-primary hover:underline">Cron Jobs</a></li>
        </ul>
      </nav>

      {/* Authentication */}
      <section id="authentication" className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Authentication</h2>
        <p className="text-sm text-muted-foreground">
          The Adminyzr API uses Bearer token authentication with API keys. API keys are scoped to a specific
          organization and can be restricted to specific permissions (scopes).
        </p>

        <div className="space-y-3">
          <h3 className="font-medium">Creating an API key</h3>
          <p className="text-sm text-muted-foreground">
            Go to <strong>Settings &rarr; API Keys</strong> and click &quot;New API key&quot;. Give it a name, select the
            required scopes, and optionally set an expiration date. The full key (starting with{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">ak_</code>) is shown only once
            after creation — copy it immediately.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Using the API key</h3>
          <p className="text-sm text-muted-foreground">
            Include the API key in the <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">Authorization</code> header
            as a Bearer token:
          </p>
          <CodeBlock language="bash">{`curl -H "Authorization: Bearer ak_your_api_key_here" \\
  https://your-domain.com/api/v1/invoices`}</CodeBlock>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Available scopes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Scope</th>
                  <th className="text-left py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { scope: 'invoices:read', desc: 'Read invoices' },
                  { scope: 'invoices:write', desc: 'Create and update invoices' },
                  { scope: 'clients:read', desc: 'Read clients' },
                  { scope: 'clients:write', desc: 'Create and update clients' },
                  { scope: 'products:read', desc: 'Read products' },
                  { scope: 'quotes:read', desc: 'Read quotes' },
                  { scope: 'quotes:write', desc: 'Create and update quotes' },
                  { scope: 'reports:read', desc: 'Read reports' },
                  { scope: 'full:access', desc: 'Full access to all resources' },
                ].map((s) => (
                  <tr key={s.scope} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">{s.scope}</code>
                    </td>
                    <td className="py-2 text-muted-foreground">{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Error responses</h3>
          <p className="text-sm text-muted-foreground">
            If the API key is missing, invalid, expired, or revoked, the API returns:
          </p>
          <CodeBlock language="json">{`{
  "error": "Unauthorized \u2014 provide a valid API key via Bearer token"
}`}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            If the API key lacks the required scope, the API returns <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">403 Forbidden</code>:
          </p>
          <CodeBlock language="json">{`{
  "error": "Forbidden \u2014 missing invoices:read scope"
}`}</CodeBlock>
        </div>
      </section>

      {/* API Endpoints */}
      <section id="endpoints" className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">API Endpoints</h2>

        <EndpointSection
          method="GET"
          path="/api/v1/invoices"
          title="List invoices"
          description="Retrieve a paginated list of invoices for your organization. Only non-deleted invoices are returned, sorted by creation date (newest first)."
          auth="Bearer token with invoices:read scope"
          params={[
            { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
            { name: 'limit', type: 'integer', required: false, description: 'Results per page, max 100 (default: 25)' },
            { name: 'status', type: 'string', required: false, description: 'Filter by status: draft, sent, paid, overdue, cancelled' },
          ]}
          curlExample={`curl -X GET "https://your-domain.com/api/v1/invoices?page=1&limit=10&status=sent" \\
  -H "Authorization: Bearer ak_your_api_key_here"`}
          responseExample={`{
  "data": [
    {
      "id": "abc123",
      "invoiceNumber": "INV-2026-0001",
      "client": { "id": "def456", "companyName": "Acme B.V." },
      "status": "sent",
      "issueDate": "2026-03-01",
      "dueDate": "2026-03-31",
      "subtotal": 100000,
      "vatAmount": 21000,
      "totalIncVat": 121000,
      "createdAt": "2026-03-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "totalDocs": 42,
    "totalPages": 5,
    "page": 1,
    "hasNextPage": true
  }
}`}
        />

        <EndpointSection
          method="GET"
          path="/api/health"
          title="Health check"
          description="Simple health check endpoint that returns the current server status and timestamp. No authentication required."
          auth="None"
          curlExample={`curl -X GET "https://your-domain.com/api/health"`}
          responseExample={`{
  "status": "ok",
  "timestamp": "2026-03-27T12:00:00.000Z"
}`}
        />

        <EndpointSection
          method="POST"
          path="/api/ocr/process"
          title="OCR invoice processing"
          description="Upload a PDF or image file to extract invoice data using OCR. Accepts multipart/form-data with a single file field. Supported formats: PDF, JPEG, PNG, WebP."
          auth="Session cookie (logged-in user)"
          params={[
            { name: 'file', type: 'File', required: true, description: 'The invoice file to process (PDF, JPEG, PNG, or WebP, max 10MB)' },
          ]}
          curlExample={`curl -X POST "https://your-domain.com/api/ocr/process" \\
  -H "Cookie: payload-token=your_session_token" \\
  -F "file=@invoice.pdf"`}
          responseExample={`{
  "supplier": "Acme B.V.",
  "invoiceNumber": "F-2026-001",
  "issueDate": "2026-03-15",
  "dueDate": "2026-04-14",
  "subtotal": 50000,
  "vatAmount": 10500,
  "totalIncVat": 60500,
  "confidence": 0.92
}`}
        />

        <EndpointSection
          method="GET"
          path="/api/reports/vat-export"
          title="VAT report CSV export"
          description="Export a VAT report for a given period as a CSV file (semicolon-delimited). The CSV includes all invoices in the period with VAT breakdown and summary totals. All amounts are in euros (converted from cents)."
          auth="Session cookie (logged-in user)"
          params={[
            { name: 'start', type: 'string', required: true, description: 'Period start date (YYYY-MM-DD)' },
            { name: 'end', type: 'string', required: true, description: 'Period end date (YYYY-MM-DD)' },
          ]}
          curlExample={`curl -X GET "https://your-domain.com/api/reports/vat-export?start=2026-01-01&end=2026-03-31" \\
  -H "Cookie: payload-token=your_session_token" \\
  -o btw-rapport.csv`}
          responseExample={`Factuurnummer;Klant;Factuurdatum;Subtotaal;BTW-tarief;BTW-bedrag;Totaal incl. BTW;Status
INV-2026-0001;"Acme B.V.";2026-01-15;1000.00;21%;210.00;1210.00;paid
INV-2026-0002;"Beta Corp";2026-02-01;500.00;9%;45.00;545.00;sent

Totaal;;;;;255.00;1755.00;
BTW 21%:;;;;;210.00;;
BTW 9%:;;;;;45.00;;
BTW 0%:;;;;;0.00;;`}
        />
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Webhooks</h2>
        <p className="text-sm text-muted-foreground">
          These endpoints receive incoming webhook events from external services. They are not meant to be called
          directly by API consumers — they are configured in the respective external platforms.
        </p>

        <EndpointSection
          method="POST"
          path="/api/webhooks/stripe"
          title="Stripe subscription events"
          description={
            'Receives Stripe webhook events for subscription lifecycle management. ' +
            'Verifies the request signature using the STRIPE_WEBHOOK_SECRET environment variable. ' +
            'Handles the following events: checkout.session.completed (activates a subscription), ' +
            'customer.subscription.updated (syncs subscription status), and ' +
            'customer.subscription.deleted (marks subscription as canceled). ' +
            'All events are logged to the webhook-log collection.'
          }
          auth="Stripe webhook signature (stripe-signature header)"
          params={[
            { name: 'stripe-signature', type: 'string (header)', required: true, description: 'Stripe webhook signature for payload verification' },
          ]}
          curlExample={`# This endpoint is called by Stripe automatically.
# Configure the webhook URL in your Stripe Dashboard:
# https://dashboard.stripe.com/webhooks
#
# Webhook URL: https://your-domain.com/api/webhooks/stripe
# Events: checkout.session.completed,
#          customer.subscription.updated,
#          customer.subscription.deleted`}
          responseExample={`{
  "received": true
}`}
        />

        <EndpointSection
          method="POST"
          path="/api/webhooks/sityzr"
          title="Sityzr tenant provisioning"
          description={
            'Receives tenant lifecycle events from the Sityzr platform. ' +
            'Verifies the request signature using the SITYZR_WEBHOOK_SECRET environment variable ' +
            'via the x-sityzr-signature header. ' +
            'Handles three event types: tenant.activate (creates a new organization and owner user), ' +
            'tenant.deactivate (soft-deletes the organization), and ' +
            'tenant.update (syncs the tenant name). ' +
            'All events are logged to the webhook-log collection.'
          }
          auth="Sityzr webhook signature (x-sityzr-signature header)"
          params={[
            { name: 'x-sityzr-signature', type: 'string (header)', required: true, description: 'HMAC signature for payload verification' },
          ]}
          curlExample={`# This endpoint is called by Sityzr automatically.
# Configure the webhook URL in your Sityzr tenant settings.
#
# Webhook URL: https://your-domain.com/api/webhooks/sityzr
#
# Example payload for tenant.activate:
curl -X POST "https://your-domain.com/api/webhooks/sityzr" \\
  -H "Content-Type: application/json" \\
  -H "x-sityzr-signature: your_hmac_signature" \\
  -d '{
    "type": "tenant.activate",
    "data": {
      "tenantId": "t_abc123",
      "tenantName": "My Company",
      "domain": "mycompany.sityzr.nl",
      "ownerEmail": "owner@example.com",
      "ownerName": "John Doe"
    }
  }'`}
          responseExample={`{
  "status": "activated",
  "orgId": "org_abc123"
}`}
        />
      </section>

      {/* Cron Jobs */}
      <section id="cron" className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Cron Jobs</h2>
        <p className="text-sm text-muted-foreground">
          These endpoints are designed to be triggered by an external cron scheduler (e.g., a cron job on your
          server or a service like cron-job.org). They are protected by a shared secret passed as a query parameter.
        </p>
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Security note:</strong> The <code className="bg-amber-100 dark:bg-amber-900 rounded px-1 py-0.5 text-xs font-mono">key</code> parameter
            must match the <code className="bg-amber-100 dark:bg-amber-900 rounded px-1 py-0.5 text-xs font-mono">CRON_SECRET</code> environment
            variable. Keep this secret safe and never expose it in client-side code.
          </p>
        </div>

        <EndpointSection
          method="GET"
          path="/api/cron/reminders"
          title="Payment reminders"
          description={
            'Processes overdue invoice reminders. This endpoint performs two actions: ' +
            '(1) marks all sent invoices past their due date as overdue, and ' +
            '(2) sends email reminders to clients on a schedule of day 1, 7, and 14 after the due date. ' +
            'Each reminder is logged in the email-log collection.'
          }
          auth="Shared secret via query parameter"
          params={[
            { name: 'key', type: 'string', required: true, description: 'Must match the CRON_SECRET environment variable' },
          ]}
          curlExample={`curl -X GET "https://your-domain.com/api/cron/reminders?key=your_cron_secret"`}
          responseExample={`{
  "success": true,
  "markedOverdue": 3,
  "remindersSent": 5,
  "timestamp": "2026-03-27T08:00:00.000Z"
}`}
        />

        <EndpointSection
          method="GET"
          path="/api/cron/subscriptions"
          title="Subscription invoice generation"
          description={
            'Generates invoices for active subscriptions that are due. For each subscription where ' +
            'nextInvoiceDate <= today, it creates an invoice with the correct amount, VAT rate, and payment terms. ' +
            'If autoSend is enabled on the subscription, the invoice is automatically marked as sent. ' +
            'After generation, the subscription\'s nextInvoiceDate is advanced by the subscription interval ' +
            '(weekly, monthly, quarterly, or yearly). Subscriptions past their end date are marked as expired.'
          }
          auth="Shared secret via query parameter"
          params={[
            { name: 'key', type: 'string', required: true, description: 'Must match the CRON_SECRET environment variable' },
          ]}
          curlExample={`curl -X GET "https://your-domain.com/api/cron/subscriptions?key=your_cron_secret"`}
          responseExample={`{
  "success": true,
  "processed": 10,
  "generated": 8,
  "errors": 2,
  "errorDetails": [
    {
      "subscriptionId": "sub_xyz",
      "error": "Client not found"
    }
  ],
  "timestamp": "2026-03-27T06:00:00.000Z"
}`}
        />
      </section>

      {/* Rate limits / notes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>
            All monetary amounts are stored and returned in <strong>cents</strong> (integer). For example,{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">121000</code> means &euro;1,210.00.
          </li>
          <li>
            Dates are returned in ISO 8601 format (<code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">YYYY-MM-DD</code> or full ISO timestamp).
          </li>
          <li>
            All API responses use <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">application/json</code> content type
            unless otherwise noted (e.g., CSV export).
          </li>
          <li>
            Deleted records (soft-deleted via <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">deletedAt</code> timestamp)
            are excluded from all query results.
          </li>
          <li>
            API key usage is tracked automatically. Each request updates the key&apos;s <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">lastUsedAt</code> timestamp
            and increments the <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">usageCount</code>.
          </li>
        </ul>
      </section>
    </div>
  )
}
