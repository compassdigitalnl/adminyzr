import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { setOrganization } from '../hooks/setOrganization'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'isRead', 'createdAt'],
  },
  access: {
    read: tenantIsolation,
    create: () => true,
    update: tenantIsolation,
    delete: tenantIsolation,
  },
  hooks: {
    beforeValidate: [setOrganization],
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Gebruiker',
      admin: { description: 'Als leeg, zichtbaar voor alle teamleden' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titel',
    },
    {
      name: 'message',
      type: 'text',
      label: 'Bericht',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Succes', value: 'success' },
        { label: 'Waarschuwing', value: 'warning' },
        { label: 'Fout', value: 'error' },
        { label: 'Betaling', value: 'payment' },
        { label: 'Factuur', value: 'invoice' },
      ],
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      label: 'Gelezen',
    },
    {
      name: 'link',
      type: 'text',
      label: 'Link',
      admin: { description: 'Relatief pad bijv. /invoices' },
    },
    {
      name: 'relatedCollection',
      type: 'text',
    },
    {
      name: 'relatedDocumentId',
      type: 'text',
    },
  ],
  timestamps: true,
}
