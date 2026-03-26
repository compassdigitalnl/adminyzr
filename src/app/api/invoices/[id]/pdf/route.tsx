import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getPayloadClient } from '@/lib/get-payload'
import { InvoicePdf, type InvoicePdfData } from '@/lib/pdf/invoice-template'
import React from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await getPayloadClient()

  // Auth check via cookie
  const token = request.cookies.get('payload-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { user } = await payload.auth({
    headers: new Headers({ Authorization: `JWT ${token}` }),
  })
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const orgId = typeof user.organization === 'object' ? user.organization.id : user.organization

  try {
    // Fetch invoice
    const invoice = (await payload.findByID({
      collection: 'invoices',
      id,
      depth: 1,
    })) as Record<string, unknown>

    // Verify tenant isolation
    const invoiceOrgId =
      typeof invoice.organization === 'object'
        ? (invoice.organization as Record<string, unknown>).id
        : invoice.organization
    if (String(invoiceOrgId) !== String(orgId)) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
    }

    // Fetch organization
    const org = (await payload.findByID({
      collection: 'organizations',
      id: orgId as string,
    })) as Record<string, unknown>

    // Fetch invoice items
    const { docs: items } = await payload.find({
      collection: 'invoice-items',
      where: { invoice: { equals: id } },
      sort: 'sortOrder',
      limit: 100,
    })

    // Build PDF data
    const client = invoice.client as Record<string, unknown> | undefined
    const clientAddress = client?.address as Record<string, string> | undefined
    const orgAddress = org.address as Record<string, string> | undefined
    const orgContact = org.contact as Record<string, string> | undefined
    const invoiceSettings = org.invoiceSettings as Record<string, unknown> | undefined

    const pdfData: InvoicePdfData = {
      invoiceNumber: (invoice.invoiceNumber as string) || '',
      issueDate: (invoice.issueDate as string) || new Date().toISOString(),
      dueDate: (invoice.dueDate as string) || new Date().toISOString(),
      reference: invoice.reference as string | undefined,
      status: (invoice.type as string) || 'invoice',
      orgName: (org.name as string) || '',
      orgAddress: orgAddress
        ? [orgAddress.street, orgAddress.houseNumber, orgAddress.postalCode, orgAddress.city]
            .filter(Boolean)
            .join(' ')
        : undefined,
      orgKvk: org.kvkNumber as string | undefined,
      orgVat: org.vatNumber as string | undefined,
      orgIban: org.iban as string | undefined,
      orgEmail: orgContact?.email,
      orgPhone: orgContact?.phone,
      clientName: (client?.companyName as string) || '',
      clientAddress: clientAddress
        ? [clientAddress.street, clientAddress.houseNumber, clientAddress.postalCode, clientAddress.city]
            .filter(Boolean)
            .join(' ')
        : undefined,
      clientKvk: client?.kvkNumber as string | undefined,
      clientVat: client?.vatNumber as string | undefined,
      items: items.map((item) => {
        const i = item as Record<string, unknown>
        return {
          description: (i.description as string) || '',
          quantity: (i.quantity as number) || 0,
          unitPrice: (i.unitPrice as number) || 0,
          vatRate: (i.vatRate as string) || '21',
          lineTotal: (i.lineTotal as number) || 0,
        }
      }),
      subtotal: (invoice.subtotal as number) || 0,
      vatAmount: (invoice.vatAmount as number) || 0,
      totalIncVat: (invoice.totalIncVat as number) || 0,
      notes: invoice.notes as string | undefined,
      footerText: invoiceSettings?.footerText as string | undefined,
    }

    // Render PDF
    // eslint-disable-next-line
    const buffer = await renderToBuffer(React.createElement(InvoicePdf, { data: pdfData }) as any)

    const filename = `${pdfData.invoiceNumber || 'factuur'}.pdf`

    return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Fout bij PDF generatie' },
      { status: 500 }
    )
  }
}
