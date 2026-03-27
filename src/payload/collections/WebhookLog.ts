import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'

export const WebhookLog: CollectionConfig = {
  slug: 'webhook-log',
  admin: {
    useAsTitle: 'source',
    defaultColumns: ['direction', 'source', 'statusCode', 'createdAt'],
  },
  access: {
    read: tenantIsolation,
    create: () => false,
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
      name: 'direction',
      type: 'select',
      required: true,
      options: [
        { label: 'Inkomend', value: 'incoming' },
        { label: 'Uitgaand', value: 'outgoing' },
      ],
    },
    {
      name: 'source',
      type: 'text',
      required: true,
      label: 'Bron',
    },
    {
      name: 'method',
      type: 'text',
      label: 'HTTP-methode',
    },
    {
      name: 'url',
      type: 'text',
    },
    {
      name: 'requestHeaders',
      type: 'json',
      label: 'Request headers',
    },
    {
      name: 'requestBody',
      type: 'json',
      label: 'Request body',
    },
    {
      name: 'responseBody',
      type: 'json',
      label: 'Response body',
    },
    {
      name: 'statusCode',
      type: 'number',
      label: 'Statuscode',
    },
    {
      name: 'error',
      type: 'textarea',
      label: 'Foutmelding',
    },
  ],
  timestamps: true,
}
