'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { z } from 'zod'

const registerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  kvkNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterOrganizationInput = z.infer<typeof registerSchema>

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function registerOrganization(data: RegisterOrganizationInput): Promise<{
  success: boolean
  orgId?: string
  userId?: string
  error?: string
}> {
  try {
    const validated = registerSchema.parse(data)
    const payload = await getPayloadClient()

    // Check if email already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: { email: { equals: validated.email } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingUsers.totalDocs > 0) {
      return { success: false, error: 'email_exists' }
    }

    // Generate a unique slug
    let slug = generateSlug(validated.companyName)
    const existingSlugs = await payload.find({
      collection: 'organizations',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingSlugs.totalDocs > 0) {
      slug = `${slug}-${Date.now()}`
    }

    // Create organization
    const org = await payload.create({
      collection: 'organizations',
      data: {
        name: validated.companyName,
        slug,
        kvkNumber: validated.kvkNumber || undefined,
        vatNumber: validated.vatNumber || undefined,
        invoiceSettings: {
          prefix: 'INV',
          nextNumber: 1,
          defaultPaymentTermDays: 30,
          defaultVatRate: 21,
        },
      },
      overrideAccess: true,
    })

    // Create user with role 'owner' linked to the organization
    const user = await payload.create({
      collection: 'users',
      data: {
        name: validated.name,
        email: validated.email,
        password: validated.password,
        role: 'owner',
        organization: org.id,
        locale: 'nl',
      },
      overrideAccess: true,
    })

    return {
      success: true,
      orgId: org.id as string,
      userId: user.id as string,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' }
    }
    console.error('Registration error:', error)
    return { success: false, error: 'registration_failed' }
  }
}
