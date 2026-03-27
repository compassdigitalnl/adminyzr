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

export type ReminderEmailData = {
  orgName: string
  clientName: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  totalIncVat: number
  daysPastDue: number
  reminderNumber: number
  orgLogo?: string
  brandColor?: string
}

export function reminderEmailHtml(data: ReminderEmailData): string {
  const urgency = data.reminderNumber >= 3 ? 'Laatste herinnering' :
    data.reminderNumber === 2 ? 'Tweede herinnering' : 'Herinnering'

  const headerColor = data.reminderNumber >= 3
    ? '#DC2626'
    : data.reminderNumber === 2
      ? (data.brandColor ? data.brandColor : '#F59E0B')
      : '#F59E0B'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: ${headerColor}; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header .logo { max-height: 40px; margin-bottom: 8px; }
    .header .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-top: 8px; }
    .content { padding: 32px; }
    .details { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .detail-label { color: #666; }
    .detail-value { font-weight: 600; }
    .overdue { color: #DC2626; font-weight: 600; }
    .total-row { border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 10px; font-size: 16px; }
    .footer { padding: 20px 32px; background: #f8f9fa; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${data.orgLogo ? `<img src="${data.orgLogo}" alt="${data.orgName}" class="logo">` : ''}
      <h1>${urgency}</h1>
      <div class="badge">Factuur ${data.invoiceNumber}</div>
    </div>
    <div class="content">
      <p>Beste ${data.clientName},</p>
      <p>Wij constateren dat de betaling van onderstaande factuur nog niet door ons is ontvangen. De vervaldatum is ${data.daysPastDue} dagen geleden verstreken.</p>

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
          <span class="overdue">${formatDate(data.dueDate)}</span>
        </div>
        <div class="detail-row total-row">
          <span class="detail-label">Openstaand bedrag</span>
          <span class="detail-value">${formatEuro(data.totalIncVat)}</span>
        </div>
      </div>

      <p>Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk over te maken. Indien u reeds betaald heeft, kunt u deze herinnering als niet verzonden beschouwen.</p>
    </div>
    <div class="footer">
      <p>${data.orgName} — Verstuurd via Adminyzr</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function reminderEmailText(data: ReminderEmailData): string {
  const urgency = data.reminderNumber >= 3 ? 'LAATSTE HERINNERING' :
    data.reminderNumber === 2 ? 'TWEEDE HERINNERING' : 'HERINNERING'

  return `
${urgency} — Factuur ${data.invoiceNumber}

Beste ${data.clientName},

Wij constateren dat de betaling van onderstaande factuur nog niet door ons is ontvangen. De vervaldatum is ${data.daysPastDue} dagen geleden verstreken.

Factuurnummer: ${data.invoiceNumber}
Factuurdatum: ${formatDate(data.issueDate)}
Vervaldatum: ${formatDate(data.dueDate)}
Openstaand bedrag: ${formatEuro(data.totalIncVat)}

Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk over te maken.

Met vriendelijke groet,
${data.orgName}
  `.trim()
}
