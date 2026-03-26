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
  ],

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),

  plugins: [
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
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
      },
    }),
  ],

  secret: process.env.PAYLOAD_SECRET || 'CHANGE_ME_IN_PRODUCTION',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
