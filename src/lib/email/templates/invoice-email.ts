function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export type InvoiceEmailData = {
  orgName: string
  clientName: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  totalIncVat: number
  notes?: string
}

export function invoiceEmailHtml(data: InvoiceEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #2563EB; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .detail-label { color: #666; }
    .detail-value { font-weight: 600; }
    .total-row { border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 10px; font-size: 16px; }
    .note { font-size: 14px; color: #444; margin-top: 20px; line-height: 1.6; }
    .footer { padding: 20px 32px; background: #f8f9fa; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.orgName}</h1>
    </div>
    <div class="content">
      <p class="greeting">Beste ${data.clientName},</p>
      <p>Hierbij ontvangt u factuur <strong>${data.invoiceNumber}</strong>. In de bijlage vindt u de factuur als PDF.</p>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Factuurnummer</span>
          <span class="detail-value">${data.invoiceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Factuurdatum</span>
          <span class="detail-value">${formatDate(data.issueDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Vervaldatum</span>
          <span class="detail-value">${formatDate(data.dueDate)}</span>
        </div>
        <div class="detail-row total-row">
          <span class="detail-label">Totaal incl. BTW</span>
          <span class="detail-value">${formatEuro(data.totalIncVat)}</span>
        </div>
      </div>

      ${data.notes ? `<p class="note">${data.notes}</p>` : ''}

      <p style="font-size: 14px; color: #444; margin-top: 24px;">
        Wij verzoeken u vriendelijk het bedrag voor de vervaldatum over te maken.
      </p>
    </div>
    <div class="footer">
      <p>${data.orgName} — Verstuurd via Adminyzr</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function invoiceEmailText(data: InvoiceEmailData): string {
  return `
Beste ${data.clientName},

Hierbij ontvangt u factuur ${data.invoiceNumber}.

Factuurnummer: ${data.invoiceNumber}
Factuurdatum: ${formatDate(data.issueDate)}
Vervaldatum: ${formatDate(data.dueDate)}
Totaal incl. BTW: ${formatEuro(data.totalIncVat)}

${data.notes ? `Opmerking: ${data.notes}\n` : ''}
Wij verzoeken u vriendelijk het bedrag voor de vervaldatum over te maken.

Met vriendelijke groet,
${data.orgName}
  `.trim()
}
