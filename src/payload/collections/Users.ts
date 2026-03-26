import type { CollectionConfig, Where } from 'payload'
import { isAdmin } from '@/payload/access/isAdmin'
import { logAfterChange, logAfterDelete } from '@/payload/hooks/auditLog'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'organization'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner') return true
      const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization
      if (user.role === 'admin') return { organization: { equals: orgId } } as Where
      return { id: { equals: user.id } } as Where
    },
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner') return true
      const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization
      if (user.role === 'admin') return { organization: { equals: orgId } } as Where
      return { id: { equals: user.id } } as Where
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'owner'
    },
  },
  hooks: {
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
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Admin', value: 'admin' },
        { label: 'Accountant', value: 'accountant' },
        { label: 'Medewerker', value: 'member' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: {
        description: 'De organisatie (tenant) waar deze gebruiker bij hoort.',
      },
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'attachments',
    },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'nl',
      options: [
        { label: 'Nederlands', value: 'nl' },
        { label: 'English', value: 'en' },
      ],
    },
    // 2FA (TOTP)
    {
      name: 'twoFactorSecret',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'twoFactorEnabled',
      type: 'checkbox',
      defaultValue: false,
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
