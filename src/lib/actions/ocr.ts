'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { cookies } from 'next/headers'
import { processInvoiceOcr, type OcrResult } from '@/lib/services/ocr'

async function getAuthUser() {
  const payload = await getPayloadClient()
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) throw new Error('Niet ingelogd')
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user) throw new Error('Niet ingelogd')
  const orgId = user.organization && typeof user.organization === 'object' ? user.organization.id : user.organization
  if (!orgId) throw new Error('Geen organisatie gevonden')
  return { payload, user, orgId: orgId as string }
}

export type OcrProcessResult = {
  success: boolean
  ocrResult?: OcrResult
  purchaseInvoiceId?: string
  error?: string
}

/**
 * Process an uploaded file with OCR and optionally create a purchase invoice draft.
 */
export async function processOcrUpload(
  formData: FormData,
  options?: { autoCreate?: boolean },
): Promise<OcrProcessResult> {
  const { payload, orgId } = await getAuthUser()

  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false, error: 'Geen bestand geüpload' }
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Ongeldig bestandstype. Upload een PDF of afbeelding.' }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: 'Bestand is te groot (max 10MB)' }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ocrResult = await processInvoiceOcr(buffer, file.name)

    // Optionally auto-create a purchase invoice when confidence is high enough
    if (options?.autoCreate && ocrResult.confidence !== 'low') {
      const purchaseInvoice = await payload.create({
        collection: 'purchase-invoices',
        data: {
          organization: orgId,
          supplier: ocrResult.data.supplier || 'Onbekende leverancier',
          supplierVatNumber: ocrResult.data.supplierVatNumber,
          supplierIban: ocrResult.data.supplierIban,
          invoiceNumber: ocrResult.data.invoiceNumber,
          issueDate: ocrResult.data.issueDate,
          dueDate: ocrResult.data.dueDate,
          subtotal: ocrResult.data.subtotal || 0,
          vatAmount: ocrResult.data.vatAmount || 0,
          totalIncVat: ocrResult.data.totalIncVat || 0,
          status: 'pending_review',
          ocrConfidence: ocrResult.confidence,
          ocrConfidenceScore: ocrResult.confidenceScore,
          ocrProcessedAt: new Date().toISOString(),
        },
      })

      return {
        success: true,
        ocrResult,
        purchaseInvoiceId: String(purchaseInvoice.id),
      }
    }

    return { success: true, ocrResult }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR verwerking mislukt'
    return { success: false, error: message }
  }
}

/**
 * Re-process OCR for an existing purchase invoice with an attached file.
 */
export async function reprocessOcr(purchaseInvoiceId: string): Promise<OcrProcessResult> {
  const { payload } = await getAuthUser()

  const purchaseInvoice = await payload.findByID({
    collection: 'purchase-invoices',
    id: purchaseInvoiceId,
    depth: 1,
  }) as Record<string, unknown>

  const attachment = purchaseInvoice.attachment as Record<string, unknown> | undefined
  if (!attachment?.url) {
    return { success: false, error: 'Geen bijlage gevonden bij deze inkoopfactuur' }
  }

  try {
    // Fetch the file from storage
    const fileUrl = attachment.url as string
    const absoluteUrl = fileUrl.startsWith('http')
      ? fileUrl
      : `${process.env.NEXT_PUBLIC_APP_URL}${fileUrl}`

    const response = await fetch(absoluteUrl)
    if (!response.ok) {
      return { success: false, error: 'Kan bijlage niet ophalen' }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const fileName = (attachment.filename as string) || 'document.pdf'
    const ocrResult = await processInvoiceOcr(buffer, fileName)

    // Update the purchase invoice with OCR results
    await payload.update({
      collection: 'purchase-invoices',
      id: purchaseInvoiceId,
      data: {
        supplier: ocrResult.data.supplier || purchaseInvoice.supplier,
        supplierVatNumber: ocrResult.data.supplierVatNumber || purchaseInvoice.supplierVatNumber,
        supplierIban: ocrResult.data.supplierIban || purchaseInvoice.supplierIban,
        invoiceNumber: ocrResult.data.invoiceNumber || purchaseInvoice.invoiceNumber,
        issueDate: ocrResult.data.issueDate || purchaseInvoice.issueDate,
        dueDate: ocrResult.data.dueDate || purchaseInvoice.dueDate,
        subtotal: ocrResult.data.subtotal ?? purchaseInvoice.subtotal,
        vatAmount: ocrResult.data.vatAmount ?? purchaseInvoice.vatAmount,
        totalIncVat: ocrResult.data.totalIncVat ?? purchaseInvoice.totalIncVat,
        ocrConfidence: ocrResult.confidence,
        ocrConfidenceScore: ocrResult.confidenceScore,
        ocrProcessedAt: new Date().toISOString(),
      },
    })

    return {
      success: true,
      ocrResult,
      purchaseInvoiceId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR herverwerking mislukt'
    return { success: false, error: message }
  }
}
