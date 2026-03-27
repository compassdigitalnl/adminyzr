import { z } from 'zod'
import { NextResponse } from 'next/server'

// ─── Shared schemas ─────────────────────────────────────────────────────────

export const clientSchema = z.object({
  companyName: z.string().min(1, 'Bedrijfsnaam is verplicht').optional(),
  contactName: z.string().optional(),
  email: z.string().email('Ongeldig e-mailadres').optional(),
  phone: z.string().optional(),
  kvkNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  iban: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  paymentTermDays: z.number().int().min(0).max(365).optional(),
}).refine((data) => data.companyName || data.contactName, {
  message: 'Bedrijfsnaam of contactnaam is verplicht',
})

export const productSchema = z.object({
  name: z.string().min(1, 'Productnaam is verplicht'),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().int().min(0, 'Prijs moet positief zijn'),
  vatRate: z.enum(['21', '9', '0', 'exempt']).default('21'),
  unit: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const invoiceCreateSchema = z.object({
  client: z.string().or(z.number()),
  issueDate: z.string(),
  dueDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().default('EUR'),
})

export const quoteCreateSchema = z.object({
  client: z.string().or(z.number()),
  validUntil: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export const purchaseInvoiceCreateSchema = z.object({
  supplier: z.string().min(1, 'Leverancier is verplicht'),
  supplierVatNumber: z.string().optional(),
  supplierIban: z.string().optional(),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().int().min(0).default(0),
  vatAmount: z.number().int().min(0).default(0),
  totalIncVat: z.number().int().min(0).default(0),
  currency: z.string().default('EUR'),
  category: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Validation helper ──────────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown):
  { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body)

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validatie mislukt',
            details: result.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        },
        { status: 422 },
      ),
    }
  }

  return { success: true, data: result.data }
}
