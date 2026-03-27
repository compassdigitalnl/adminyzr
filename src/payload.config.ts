import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './payload/collections/Users'
import { Organizations } from './payload/collections/Organizations'
import { Clients } from './payload/collections/Clients'
import { Invoices } from './payload/collections/Invoices'
import { InvoiceItems } from './payload/collections/InvoiceItems'
import { Products } from './payload/collections/Products'
import { PunchCards } from './payload/collections/PunchCards'
import { TimeEntries } from './payload/collections/TimeEntries'
import { Quotes } from './payload/collections/Quotes'
import { PurchaseInvoices } from './payload/collections/PurchaseInvoices'
import { Attachments } from './payload/collections/Attachments'
import { AuditLog } from './payload/collections/AuditLog'
import { CreditNotes } from './payload/collections/CreditNotes'
import { EmailLog } from './payload/collections/EmailLog'
import { WebhookLog } from './payload/collections/WebhookLog'
import { TaxRates } from './payload/collections/TaxRates'
import { PaymentTerms } from './payload/collections/PaymentTerms'
import { ApiKeys } from './payload/collections/ApiKeys'
import { Projects } from './payload/collections/Projects'
import { Subscriptions } from './payload/collections/Subscriptions'
import { Employees } from './payload/collections/Employees'
import { LeaveRequests } from './payload/collections/LeaveRequests'
import { PayrollRuns } from './payload/collections/PayrollRuns'
import { PayrollEntries } from './payload/collections/PayrollEntries'
import { Orders } from './payload/collections/Orders'
import { PaymentProviders } from './payload/collections/PaymentProviders'
import { Transactions } from './payload/collections/Transactions'
import { BankAccounts } from './payload/collections/BankAccounts'
import { BankTransactions } from './payload/collections/BankTransactions'
import { Notifications } from './payload/collections/Notifications'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' | Adminyzr',
    },
  },

  editor: lexicalEditor(),

  collections: [
    Users,
    Organizations,
    Clients,
    Invoices,
    InvoiceItems,
    Products,
    PunchCards,
    TimeEntries,
    Quotes,
    PurchaseInvoices,
    Attachments,
    AuditLog,
    CreditNotes,
    EmailLog,
    WebhookLog,
    TaxRates,
    PaymentTerms,
    ApiKeys,
    Projects,
    Subscriptions,
    Employees,
    LeaveRequests,
    PayrollRuns,
    PayrollEntries,
    Orders,
    PaymentProviders,
    Transactions,
    BankAccounts,
    BankTransactions,
    Notifications,
  ],

  db: postgresAdapter({
    push: true,
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),

  plugins: [
    // S3-compatible storage — works with both AWS S3 and Cloudflare R2.
    //
    // Cloudflare R2 configuration:
    //   S3_ENDPOINT = https://<account-id>.r2.cloudflarestorage.com
    //   S3_REGION   = auto
    //   forcePathStyle must be true (R2 does not support virtual-hosted-style URLs)
    //
    // AWS S3 configuration:
    //   S3_ENDPOINT = (leave empty or omit — the SDK uses the default AWS endpoint)
    //   S3_REGION   = eu-central-1 (or whichever region your bucket lives in)
    //   forcePathStyle can be true or false; true is safest for compatibility
    s3Storage({
      collections: {
        attachments: {
          prefix: 'attachments',
        },
      },
      bucket: process.env.S3_BUCKET || 'adminyzr-documents',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'auto',
        // When S3_ENDPOINT is empty/undefined the SDK falls back to the default
        // AWS endpoint, so leaving it unset is fine for plain AWS S3.
        ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
        // Required for Cloudflare R2; safe to leave enabled for AWS S3 as well.
        forcePathStyle: true,
      },
    }),
  ],

  secret: process.env.PAYLOAD_SECRET || 'CHANGE_ME_IN_PRODUCTION',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
