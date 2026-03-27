import type { CollectionConfig } from 'payload'
import { isAdmin, isOwner } from '../access/isAdmin'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'
import { validateIban } from '../hooks/validateIban'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'kvkNumber', 'createdAt'],
  },
  access: {
    // Gebruikers zien alleen hun eigen organisatie
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner') return true
      const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
      return { id: { equals: orgId } }
    },
    // Alleen via seeding/admin — niet via gewone gebruikers
    create: isOwner,
    // Alleen owner/admin kan organisatie-instellingen wijzigen
    update: isAdmin,
    // Alleen owner kan organisatie verwijderen
    delete: isOwner,
  },
  hooks: {
    beforeValidate: [validateIban],
    afterChange: [logAfterChange],
    afterDelete: [logAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier voor de organisatie.',
      },
    },
    {
      name: 'kvkNumber',
      type: 'text',
      label: 'KvK-nummer',
    },
    {
      name: 'vatNumber',
      type: 'text',
      label: 'BTW-nummer',
    },
    {
      name: 'iban',
      type: 'text',
      label: 'IBAN',
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'houseNumber', type: 'text' },
        { name: 'postalCode', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text', defaultValue: 'NL' },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'website', type: 'text' },
      ],
    },
    {
      name: 'branding',
      type: 'group',
      label: 'Klantportaal branding',
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'attachments',
          label: 'Logo',
          admin: { description: 'Logo dat getoond wordt in het klantportaal en op factuur-emails' },
        },
        {
          name: 'primaryColor',
          type: 'text',
          defaultValue: '#2563EB',
          label: 'Primaire kleur',
          admin: { description: 'Hex kleurcode bijv. #2563EB' },
        },
        {
          name: 'secondaryColor',
          type: 'text',
          defaultValue: '#3b82f6',
          label: 'Secundaire kleur',
        },
        {
          name: 'portalWelcomeText',
          type: 'textarea',
          label: 'Welkomsttekst portaal',
          admin: { description: 'Tekst op de klantportaal landingspagina' },
        },
      ],
    },
    {
      name: 'invoiceSettings',
      type: 'group',
      label: 'Factuurinstellingen',
      fields: [
        {
          name: 'prefix',
          type: 'text',
          defaultValue: 'INV',
          admin: { description: 'Prefix voor factuurnummers, bijv. INV-2024-0001' },
        },
        {
          name: 'nextNumber',
          type: 'number',
          defaultValue: 1,
        },
        {
          name: 'defaultPaymentTermDays',
          type: 'number',
          defaultValue: 30,
        },
        {
          name: 'defaultVatRate',
          type: 'number',
          defaultValue: 21,
        },
        {
          name: 'footerText',
          type: 'textarea',
          admin: { description: 'Tekst onderaan factuur (bijv. bankgegevens, voorwaarden)' },
        },
      ],
    },
    // Stripe billing fields
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'subscriptionId',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'subscriptionStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Trialing', value: 'trialing' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'None', value: 'none' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'subscriptionPlan',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
