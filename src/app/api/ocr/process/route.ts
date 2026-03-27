import { NextRequest, NextResponse } from 'next/server'
import { processInvoiceOcr } from '@/lib/services/ocr'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ongeldig bestandstype. Upload een PDF of afbeelding.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processInvoiceOcr(buffer, file.name)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR verwerking mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
