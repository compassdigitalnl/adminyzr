import type { CollectionConfig, CollectionBeforeChangeHook, Where } from 'payload'
import { isAdmin } from '../access/isAdmin'
import { logAfterChange, logAfterDelete } from '../hooks/auditLog'

/**
 * Als er nog geen users bestaan, maak de eerste user automatisch owner.
 */
const setFirstUserAsOwner: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    req,
  })

  if (totalDocs === 0) {
    data.role = 'owner'
  }

  return data
}

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
      const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
      if (user.role === 'admin') return { organization: { equals: orgId } } as Where
      return { id: { equals: user.id } } as Where
    },
    create: async ({ req }) => {
      // Allow first user creation when no users exist
      if (!req.user) {
        const { totalDocs } = await req.payload.count({ collection: 'users' })
        return totalDocs === 0
      }
      return req.user.role === 'owner' || req.user.role === 'admin'
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner') return true
      const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
      if (user.role === 'admin') return { organization: { equals: orgId } } as Where
      return { id: { equals: user.id } } as Where
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'owner'
    },
  },
  hooks: {
    beforeChange: [setFirstUserAsOwner],
    afterChange: [logAfterChange],
    afterDelete: [logAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
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
