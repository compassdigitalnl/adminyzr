'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import type { Where } from 'payload'

const ROLE_HIERARCHY = ['owner', 'admin', 'accountant', 'member', 'viewer'] as const
type Role = (typeof ROLE_HIERARCHY)[number]

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  return { payload, user, orgId }
}

function getRoleLevel(role: string): number {
  const index = ROLE_HIERARCHY.indexOf(role as Role)
  return index === -1 ? ROLE_HIERARCHY.length : index
}

export async function getTeamMembers() {
  const { payload, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  const where: Where = {
    and: [
      { organization: { equals: orgId } },
      { deletedAt: { exists: false } },
    ],
  }

  const result = await payload.find({
    collection: 'users',
    where,
    sort: '-createdAt',
    limit: 100,
  })

  return result.docs.map((doc) => ({
    id: doc.id,
    name: doc.name ?? null,
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt,
    twoFactorEnabled: doc.twoFactorEnabled ?? false,
  }))
}

export type InviteTeamMemberData = {
  email: string
  name: string
  role: Role
}

export async function inviteTeamMember(data: InviteTeamMemberData) {
  const { payload, user, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Only owner and admin can invite
  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new Error('Alleen eigenaren en admins mogen teamleden uitnodigen')
  }

  // Inviter can only assign roles equal to or lower than their own
  const inviterLevel = getRoleLevel(user.role)
  const targetLevel = getRoleLevel(data.role)
  if (targetLevel < inviterLevel) {
    throw new Error('Je kunt geen hogere rol toewijzen dan je eigen rol')
  }

  // Check if email already exists in this organization
  const existing = await payload.find({
    collection: 'users',
    where: {
      and: [
        { email: { equals: data.email } },
        { organization: { equals: orgId } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 1,
  })

  if (existing.totalDocs > 0) {
    throw new Error('Er bestaat al een gebruiker met dit e-mailadres in deze organisatie')
  }

  // Generate a random temporary password
  const temporaryPassword = crypto.randomBytes(16).toString('hex')

  const result = await payload.create({
    collection: 'users',
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      password: temporaryPassword,
      organization: orgId,
    },
  })

  revalidatePath('/[locale]/settings', 'page')
  return {
    id: result.id,
    email: result.email,
    name: result.name,
    role: result.role,
    temporaryPassword,
  }
}

export async function updateTeamMemberRole(userId: string, newRole: Role) {
  const { payload, user, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Only owner can change roles
  if (user.role !== 'owner') {
    throw new Error('Alleen de eigenaar kan rollen wijzigen')
  }

  // Cannot change own role
  if (userId === user.id) {
    throw new Error('Je kunt je eigen rol niet wijzigen')
  }

  // Verify user belongs to same organization
  const targetUser = await payload.findByID({ collection: 'users', id: userId })
  const targetOrgId = targetUser.organization && typeof targetUser.organization === 'object' ? targetUser.organization.id : targetUser.organization
  if (targetOrgId !== orgId) {
    throw new Error('Gebruiker behoort niet tot jouw organisatie')
  }

  const result = await payload.update({
    collection: 'users',
    id: userId,
    data: { role: newRole },
  })

  revalidatePath('/[locale]/settings', 'page')
  return result
}

export async function removeTeamMember(userId: string) {
  const { payload, user, orgId } = await getAuthUser()
  if (!orgId) throw new Error('Geen organisatie')

  // Only owner can remove team members
  if (user.role !== 'owner') {
    throw new Error('Alleen de eigenaar kan teamleden verwijderen')
  }

  // Cannot remove self
  if (userId === user.id) {
    throw new Error('Je kunt jezelf niet verwijderen')
  }

  // Verify user belongs to same organization
  const targetUser = await payload.findByID({ collection: 'users', id: userId })
  const targetOrgId = targetUser.organization && typeof targetUser.organization === 'object' ? targetUser.organization.id : targetUser.organization
  if (targetOrgId !== orgId) {
    throw new Error('Gebruiker behoort niet tot jouw organisatie')
  }

  const result = await payload.update({
    collection: 'users',
    id: userId,
    data: { deletedAt: new Date().toISOString() },
  })

  revalidatePath('/[locale]/settings', 'page')
  return result
}
