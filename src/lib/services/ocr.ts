/**
 * OCR service for purchase invoice recognition using Mindee API.
 *
 * Mindee Invoice API v4 extracts:
 * - Supplier name, address, VAT number
 * - Invoice number, date, due date
 * - Line items, subtotal, tax, total
 * - IBAN / payment details
 */

export type OcrConfidence = 'high' | 'medium' | 'low'

export type OcrResult = {
  confidence: OcrConfidence
  confidenceScore: number
  data: {
    supplier?: string
    supplierVatNumber?: string
    supplierIban?: string
    invoiceNumber?: string
    issueDate?: string
    dueDate?: string
    subtotal?: number // in centen
    vatAmount?: number // in centen
    totalIncVat?: number // in centen
    currency?: string
  }
  rawResponse?: unknown
}

type MindeeField<T = string> = {
  value: T | null
  confidence: number
}

type MindeeAmount = {
  value: number | null
  confidence: number
}

type MindeeDate = {
  value: string | null
  confidence: number
}

type MindeePaymentDetail = {
  iban: string | null
  confidence: number
}

type MindeeInvoicePrediction = {
  supplier_name: MindeeField
  supplier_address: MindeeField
  supplier_company_registrations: Array<{ type: string; value: string }>
  supplier_payment_details: MindeePaymentDetail[]
  invoice_number: MindeeField
  date: MindeeDate
  due_date: MindeeDate
  total_net: MindeeAmount
  total_tax: MindeeAmount
  total_amount: MindeeAmount
  locale: { currency: string; language: string }
}

function eurosToCents(euros: number | null | undefined): number | undefined {
  if (euros == null) return undefined
  return Math.round(euros * 100)
}

function classifyConfidence(score: number): OcrConfidence {
  if (score >= 0.9) return 'high'
  if (score >= 0.6) return 'medium'
  return 'low'
}

export async function processInvoiceOcr(fileBuffer: Buffer, fileName: string): Promise<OcrResult> {
  const apiKey = process.env.MINDEE_API_KEY
  if (!apiKey) {
    throw new Error('MINDEE_API_KEY is niet geconfigureerd')
  }

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' })
  formData.append('document', blob, fileName)

  const response = await fetch(
    'https://api.mindee.net/v1/products/mindee/invoices/v4/predict',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mindee API fout (${response.status}): ${errorText}`)
  }

  const result = await response.json()
  const prediction: MindeeInvoicePrediction = result.document?.inference?.prediction

  if (!prediction) {
    throw new Error('Geen voorspelling ontvangen van Mindee API')
  }

  // Calculate average confidence across key fields
  const fieldConfidences = [
    prediction.supplier_name?.confidence ?? 0,
    prediction.invoice_number?.confidence ?? 0,
    prediction.total_amount?.confidence ?? 0,
    prediction.date?.confidence ?? 0,
  ]
  const avgConfidence = fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length

  // Extract IBAN from payment details
  const iban = prediction.supplier_payment_details?.find((pd) => pd.iban)?.iban ?? undefined

  // Extract VAT number from company registrations
  const vatReg = prediction.supplier_company_registrations?.find(
    (r) => r.type === 'VAT NUMBER' || r.type === 'vat_number',
  )

  return {
    confidence: classifyConfidence(avgConfidence),
    confidenceScore: Math.round(avgConfidence * 100),
    data: {
      supplier: prediction.supplier_name?.value ?? undefined,
      supplierVatNumber: vatReg?.value ?? undefined,
      supplierIban: iban,
      invoiceNumber: prediction.invoice_number?.value ?? undefined,
      issueDate: prediction.date?.value ?? undefined,
      dueDate: prediction.due_date?.value ?? undefined,
      subtotal: eurosToCents(prediction.total_net?.value),
      vatAmount: eurosToCents(prediction.total_tax?.value),
      totalIncVat: eurosToCents(prediction.total_amount?.value),
      currency: prediction.locale?.currency,
    },
    rawResponse: result,
  }
}
