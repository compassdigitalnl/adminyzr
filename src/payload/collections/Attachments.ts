import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access/isAuthenticated'
import { hasRole } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'

export const Attachments: CollectionConfig = {
  slug: 'attachments',
  upload: {
    staticDir: '../public/uploads',
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
    ],
  },
  admin: {
    useAsTitle: 'filename',
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: hasRole('owner', 'admin'),
    delete: hasRole('owner', 'admin'),
  },
  hooks: {
    beforeValidate: [setOrganization],
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: { position: 'sidebar' },
    },
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Logo', value: 'logo' },
        { label: 'Factuur PDF', value: 'invoice_pdf' },
        { label: 'Offerte PDF', value: 'quote_pdf' },
        { label: 'Inkoopfactuur', value: 'purchase_invoice' },
        { label: 'Bijlage', value: 'attachment' },
        { label: 'Template', value: 'template' },
      ],
    },
  ],
  timestamps: true,
}
