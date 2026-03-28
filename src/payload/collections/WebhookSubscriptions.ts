import type { CollectionConfig } from 'payload'
import { tenantIsolation } from '../access/tenantIsolation'
import { hasRoleInTenant } from '../access/hasRole'
import { setOrganization } from '../hooks/setOrganization'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

export const WebhookSubscriptions: CollectionConfig = {
  slug: 'webhook-subscriptions',
  admin: {
    useAsTitle: 'url',
    defaultColumns: ['url', 'events', 'isActive', 'lastDeliveryAt'],
  },
  access: {
    read: tenantIsolation,
    create: hasRoleInTenant('owner', 'admin'),
    update: hasRoleInTenant('owner', 'admin'),
    delete: hasRoleInTenant('owner'),
  },
  hooks: {
    beforeValidate: [setOrganization],
    afterChange: [logAfterChange],
    afterDelete: [logAfterDelete],
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
      name: 'url',
      type: 'text',
      required: true,
      label: 'Webhook URL',
      admin: { description: 'HTTPS endpoint waar events naartoe gestuurd worden' },
    },
    {
      name: 'secret',
      type: 'text',
      required: true,
      label: 'Signing secret',
      admin: { description: 'HMAC-SHA256 secret voor signature verificatie' },
    },
    {
      name: 'events',
      type: 'select',
      hasMany: true,
      required: true,
      label: 'Events',
      options: [
        { label: 'Factuur aangemaakt', value: 'invoice.created' },
        { label: 'Factuur verstuurd', value: 'invoice.sent' },
        { label: 'Factuur betaald', value: 'invoice.paid' },
        { label: 'Factuur te laat', value: 'invoice.overdue' },
        { label: 'Klant aangemaakt', value: 'client.created' },
        { label: 'Klant gewijzigd', value: 'client.updated' },
        { label: 'Betaling ontvangen', value: 'payment.received' },
        { label: 'Offerte geaccepteerd', value: 'quote.accepted' },
        { label: 'Offerte afgewezen', value: 'quote.rejected' },
        { label: 'Inkoopfactuur aangemaakt', value: 'purchase_invoice.created' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actief',
    },
    {
      name: 'lastDeliveryAt',
      type: 'date',
      admin: { readOnly: true },
      label: 'Laatst verzonden',
    },
    {
      name: 'failCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Mislukte verzendingen',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
  timestamps: true,
}
