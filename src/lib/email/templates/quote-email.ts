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

export type QuoteEmailData = {
  orgName: string
  clientName: string
  quoteNumber: string
  issueDate: string
  validUntil: string
  totalIncVat: number
  notes?: string
  orgLogo?: string
  brandColor?: string
}

export function quoteEmailHtml(data: QuoteEmailData): string {
  const brandColor = data.brandColor || '#2563EB'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: ${brandColor}; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header .logo { max-height: 40px; margin-bottom: 8px; }
    .header .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-top: 8px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .detail-label { color: #666; }
    .detail-value { font-weight: 600; }
    .total-row { border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 10px; font-size: 16px; }
    .note { font-size: 14px; color: #444; margin-top: 20px; line-height: 1.6; }
    .validity { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 12px 16px; margin-top: 20px; font-size: 14px; color: #92400E; }
    .footer { padding: 20px 32px; background: #f8f9fa; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${data.orgLogo ? `<img src="${data.orgLogo}" alt="${data.orgName}" class="logo">` : ''}
      <h1>${data.orgName}</h1>
      <div class="badge">Offerte ${data.quoteNumber}</div>
    </div>
    <div class="content">
      <p class="greeting">Beste ${data.clientName},</p>
      <p>Hierbij ontvangt u onze offerte <strong>${data.quoteNumber}</strong>. In de bijlage vindt u de offerte als PDF.</p>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Offertenummer</span>
          <span class="detail-value">${data.quoteNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Offertedatum</span>
          <span class="detail-value">${formatDate(data.issueDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Geldig tot</span>
          <span class="detail-value">${formatDate(data.validUntil)}</span>
        </div>
        <div class="detail-row total-row">
          <span class="detail-label">Totaal incl. BTW</span>
          <span class="detail-value">${formatEuro(data.totalIncVat)}</span>
        </div>
      </div>

      ${data.notes ? `<p class="note">${data.notes}</p>` : ''}

      <div class="validity">
        Deze offerte is geldig tot <strong>${formatDate(data.validUntil)}</strong>. Wij horen graag of u akkoord gaat met deze offerte.
      </div>
    </div>
    <div class="footer">
      <p>${data.orgName} — Verstuurd via Adminyzr</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function quoteEmailText(data: QuoteEmailData): string {
  return `
Beste ${data.clientName},

Hierbij ontvangt u onze offerte ${data.quoteNumber}.

Offertenummer: ${data.quoteNumber}
Offertedatum: ${formatDate(data.issueDate)}
Geldig tot: ${formatDate(data.validUntil)}
Totaal incl. BTW: ${formatEuro(data.totalIncVat)}

${data.notes ? `Opmerking: ${data.notes}\n` : ''}
Deze offerte is geldig tot ${formatDate(data.validUntil)}. Wij horen graag of u akkoord gaat met deze offerte.

Met vriendelijke groet,
${data.orgName}
  `.trim()
}
