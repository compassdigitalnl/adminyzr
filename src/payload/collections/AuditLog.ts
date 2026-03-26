import type { CollectionConfig, Where } from 'payload'

export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'collection', 'user', 'createdAt'],
  },
  access: {
    // Alleen owner/admin/accountant kan audit logs lezen
    read: ({ req: { user } }) => {
      if (!user) return false
      if (!['owner', 'admin', 'accountant'].includes(user.role as string)) return false

      if (user.role === 'owner') return true

      const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization
      return {
        or: [
          { organization: { equals: orgId } },
          { organization: { exists: false } },
        ],
      } as Where
    },
    // Audit logs worden alleen via hooks aangemaakt, niet handmatig
    create: () => true, // Intern via hooks
    update: () => false, // Nooit wijzigen
    delete: () => false, // Nooit verwijderen
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: { position: 'sidebar' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Aangemaakt', value: 'create' },
        { label: 'Bijgewerkt', value: 'update' },
        { label: 'Verwijderd', value: 'delete' },
        { label: 'Verstuurd', value: 'send' },
        { label: 'Betaald', value: 'payment' },
        { label: 'Ingelogd', value: 'login' },
      ],
    },
    {
      name: 'collection',
      type: 'text',
      required: true,
      admin: { description: 'Naam van de collectie (bijv. invoices, clients)' },
    },
    {
      name: 'documentId',
      type: 'text',
      admin: { description: 'ID van het betreffende document' },
    },
    {
      name: 'changes',
      type: 'json',
      admin: { description: 'Gewijzigde velden (before/after)' },
    },
    {
      name: 'ipAddress',
      type: 'text',
    },
    {
      name: 'userAgent',
      type: 'text',
    },
  ],
  timestamps: true,
}
