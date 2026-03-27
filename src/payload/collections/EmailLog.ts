import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'

export const EmailLog: CollectionConfig = {
  slug: 'email-log',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['to', 'subject', 'status', 'direction', 'sentAt', 'createdAt'],
  },
  access: {
    read: tenantIsolation,
    create: ({ req: { user } }) => !!user,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: { position: 'sidebar' },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      label: 'Klant',
      admin: { position: 'sidebar' },
    },
    {
      name: 'to',
      type: 'email',
      required: true,
      label: 'Ontvanger',
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      label: 'Onderwerp',
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Inhoud',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Verstuurd', value: 'sent' },
        { label: 'Mislukt', value: 'failed' },
        { label: 'Geweigerd', value: 'bounced' },
      ],
    },
    {
      name: 'direction',
      type: 'select',
      defaultValue: 'outgoing',
      options: [
        { label: 'Uitgaand', value: 'outgoing' },
        { label: 'Inkomend', value: 'incoming' },
      ],
      label: 'Richting',
    },
    {
      name: 'messageId',
      type: 'text',
      label: 'Message ID',
      admin: { description: 'SMTP Message-ID voor tracking' },
    },
    {
      name: 'relatedCollection',
      type: 'text',
      label: 'Gerelateerde collectie',
      admin: { description: 'Naam van de gerelateerde collectie (bijv. invoices)' },
    },
    {
      name: 'relatedDocumentId',
      type: 'text',
      label: 'Gerelateerd document ID',
    },
    {
      name: 'error',
      type: 'textarea',
      label: 'Foutmelding',
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Verstuurd op',
    },
    {
      name: 'openedAt',
      type: 'date',
      label: 'Geopend op',
      admin: { readOnly: true },
    },
    {
      name: 'clickedAt',
      type: 'date',
      label: 'Geklikt op',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
