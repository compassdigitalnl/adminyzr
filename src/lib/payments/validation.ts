import { z } from 'zod'

export const createPaymentLinkSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is verplicht'),
})

export const refundPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is verplicht'),
  amountInCents: z.number().int().positive().optional(),
})

export const paymentProviderConfigSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  provider: z.enum(['mollie', 'stripe', 'multisafepay']),
  apiKey: z.string().min(1, 'API-sleutel is verplicht'),
  testMode: z.boolean().default(false),
  webhookSecret: z.string().optional(),
  isDefault: z.boolean().default(false),
})

export const updatePaymentProviderSchema = paymentProviderConfigSchema.partial().extend({
  id: z.string().min(1),
})
