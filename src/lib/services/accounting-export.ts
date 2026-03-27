/**
 * Accounting export service — generates Snelstart, Twinfield, and generic CSV/MT940 formats.
 * All amounts are stored in cents and converted to euros for export.
 */

export type ExportInvoice = {
  invoiceNumber: string
  clientName: string
  clientCode: string
  issueDate: string
  subtotal: number // cents
  vatAmount: number // cents
  totalIncVat: number // cents
  vatRate: string // '21', '9', '0'
  reference: string
}

export type ExportPurchaseInvoice = {
  invoiceNumber: string
  supplier: string
  supplierCode: string
  issueDate: string
  subtotal: number // cents
  vatAmount: number // cents
  totalIncVat: number // cents
  vatRate: string // '21', '9', '0'
  category: string
}

export type ExportPeriod = {
  start: string
  end: string
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2)
}

function formatDateDutch(isoDate: string): string {
  const d = isoDate.split('T')[0]
  if (!d) return ''
  const [year, month, day] = d.split('-')
  return `${day}-${month}-${year}`
}

function getVatCode(vatRate: string): string {
  switch (vatRate) {
    case '21':
      return 'H21'
    case '9':
      return 'H9'
    case '0':
    default:
      return 'H0'
  }
}

function getCategoryAccount(category: string): string {
  switch (category) {
    case 'operations':
      return '4100'
    case 'software':
      return '4200'
    case 'hosting':
      return '4300'
    case 'marketing':
      return '4400'
    case 'office':
      return '4500'
    case 'travel':
      return '4600'
    default:
      return '4900'
  }
}

function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generate Snelstart-compatible CSV export.
 * Columns: Boekdatum;Factuurnummer;Relatiecode;Omschrijving;Bedrag excl BTW;BTW bedrag;Bedrag incl BTW;BTW code;Grootboekrekening
 */
export function generateSnelstartExport(
  invoices: ExportInvoice[],
  purchaseInvoices: ExportPurchaseInvoice[],
  period: ExportPeriod,
): string {
  const header = [
    'Boekdatum',
    'Factuurnummer',
    'Relatiecode',
    'Omschrijving',
    'Bedrag excl BTW',
    'BTW bedrag',
    'Bedrag incl BTW',
    'BTW code',
    'Grootboekrekening',
  ].join(';')

  const rows: string[] = [header]

  // Sales invoices — revenue accounts (8000-range)
  for (const inv of invoices) {
    rows.push(
      [
        formatDateDutch(inv.issueDate),
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.clientCode || inv.clientName),
        escapeCSV(`Verkoopfactuur ${inv.invoiceNumber}`),
        centsToEuros(inv.subtotal),
        centsToEuros(inv.vatAmount),
        centsToEuros(inv.totalIncVat),
        getVatCode(inv.vatRate),
        '8000',
      ].join(';'),
    )
  }

  // Purchase invoices — expense accounts (4000-range)
  for (const inv of purchaseInvoices) {
    rows.push(
      [
        formatDateDutch(inv.issueDate),
        escapeCSV(inv.invoiceNumber || ''),
        escapeCSV(inv.supplierCode || inv.supplier),
        escapeCSV(`Inkoopfactuur ${inv.supplier}`),
        centsToEuros(inv.subtotal),
        centsToEuros(inv.vatAmount),
        centsToEuros(inv.totalIncVat),
        getVatCode(inv.vatRate),
        getCategoryAccount(inv.category),
      ].join(';'),
    )
  }

  return rows.join('\n')
}

/**
 * Generate Twinfield XML export.
 * Standard Twinfield import XML format with <transactions> root.
 */
export function generateTwinfieldExport(
  invoices: ExportInvoice[],
  purchaseInvoices: ExportPurchaseInvoice[],
  period: ExportPeriod,
): string {
  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  function formatDateXml(isoDate: string): string {
    return isoDate.split('T')[0] || ''
  }

  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<transactions>')

  let txnNumber = 1

  // Sales invoices
  for (const inv of invoices) {
    const dateStr = formatDateXml(inv.issueDate)
    lines.push('  <transaction>')
    lines.push('    <header>')
    lines.push('      <code>VRK</code>')
    lines.push(`      <number>${txnNumber}</number>`)
    lines.push(`      <date>${dateStr}</date>`)
    lines.push(`      <description>${escapeXml(`Verkoopfactuur ${inv.invoiceNumber}`)}</description>`)
    lines.push(`      <invoicenumber>${escapeXml(inv.invoiceNumber)}</invoicenumber>`)
    lines.push('    </header>')
    lines.push('    <lines>')
    // Line 1: Revenue account (credit)
    lines.push('      <line>')
    lines.push('        <dim1>8000</dim1>')
    lines.push(`        <dim2>${escapeXml(inv.clientCode || inv.clientName)}</dim2>`)
    lines.push('        <debitcredit>credit</debitcredit>')
    lines.push(`        <value>${centsToEuros(inv.subtotal)}</value>`)
    lines.push(`        <vatcode>${getVatCode(inv.vatRate)}</vatcode>`)
    lines.push('      </line>')
    // Line 2: VAT
    if (inv.vatAmount > 0) {
      lines.push('      <line>')
      lines.push('        <dim1>1500</dim1>')
      lines.push(`        <dim2>${escapeXml(inv.clientCode || inv.clientName)}</dim2>`)
      lines.push('        <debitcredit>credit</debitcredit>')
      lines.push(`        <value>${centsToEuros(inv.vatAmount)}</value>`)
      lines.push('      </line>')
    }
    // Line 3: Debtor (debit)
    lines.push('      <line>')
    lines.push('        <dim1>1300</dim1>')
    lines.push(`        <dim2>${escapeXml(inv.clientCode || inv.clientName)}</dim2>`)
    lines.push('        <debitcredit>debit</debitcredit>')
    lines.push(`        <value>${centsToEuros(inv.totalIncVat)}</value>`)
    lines.push('      </line>')
    lines.push('    </lines>')
    lines.push('  </transaction>')
    txnNumber++
  }

  // Purchase invoices
  for (const inv of purchaseInvoices) {
    const dateStr = formatDateXml(inv.issueDate)
    const account = getCategoryAccount(inv.category)
    lines.push('  <transaction>')
    lines.push('    <header>')
    lines.push('      <code>INK</code>')
    lines.push(`      <number>${txnNumber}</number>`)
    lines.push(`      <date>${dateStr}</date>`)
    lines.push(`      <description>${escapeXml(`Inkoopfactuur ${inv.supplier}`)}</description>`)
    lines.push(`      <invoicenumber>${escapeXml(inv.invoiceNumber || '')}</invoicenumber>`)
    lines.push('    </header>')
    lines.push('    <lines>')
    // Line 1: Expense account (debit)
    lines.push('      <line>')
    lines.push(`        <dim1>${account}</dim1>`)
    lines.push(`        <dim2>${escapeXml(inv.supplierCode || inv.supplier)}</dim2>`)
    lines.push('        <debitcredit>debit</debitcredit>')
    lines.push(`        <value>${centsToEuros(inv.subtotal)}</value>`)
    lines.push(`        <vatcode>${getVatCode(inv.vatRate)}</vatcode>`)
    lines.push('      </line>')
    // Line 2: VAT (debit)
    if (inv.vatAmount > 0) {
      lines.push('      <line>')
      lines.push('        <dim1>1510</dim1>')
      lines.push(`        <dim2>${escapeXml(inv.supplierCode || inv.supplier)}</dim2>`)
      lines.push('        <debitcredit>debit</debitcredit>')
      lines.push(`        <value>${centsToEuros(inv.vatAmount)}</value>`)
      lines.push('      </line>')
    }
    // Line 3: Creditor (credit)
    lines.push('      <line>')
    lines.push('        <dim1>1600</dim1>')
    lines.push(`        <dim2>${escapeXml(inv.supplierCode || inv.supplier)}</dim2>`)
    lines.push('        <debitcredit>credit</debitcredit>')
    lines.push(`        <value>${centsToEuros(inv.totalIncVat)}</value>`)
    lines.push('      </line>')
    lines.push('    </lines>')
    lines.push('  </transaction>')
    txnNumber++
  }

  lines.push('</transactions>')
  return lines.join('\n')
}

/**
 * Generate generic MT940/CSV export.
 * Simple universal format: Date;Description;Debit;Credit;VAT;Reference
 */
export function generateMtExport(
  invoices: ExportInvoice[],
  purchaseInvoices: ExportPurchaseInvoice[],
  period: ExportPeriod,
): string {
  const header = ['Date', 'Description', 'Debit', 'Credit', 'VAT', 'Reference'].join(';')

  const rows: string[] = [header]

  // Sales invoices are credits (income)
  for (const inv of invoices) {
    rows.push(
      [
        formatDateDutch(inv.issueDate),
        escapeCSV(`Verkoopfactuur ${inv.invoiceNumber} - ${inv.clientName}`),
        '',
        centsToEuros(inv.totalIncVat),
        centsToEuros(inv.vatAmount),
        escapeCSV(inv.reference || inv.invoiceNumber),
      ].join(';'),
    )
  }

  // Purchase invoices are debits (expenses)
  for (const inv of purchaseInvoices) {
    rows.push(
      [
        formatDateDutch(inv.issueDate),
        escapeCSV(`Inkoopfactuur ${inv.supplier}${inv.invoiceNumber ? ` - ${inv.invoiceNumber}` : ''}`),
        centsToEuros(inv.totalIncVat),
        '',
        centsToEuros(inv.vatAmount),
        escapeCSV(inv.invoiceNumber || ''),
      ].join(';'),
    )
  }

  return rows.join('\n')
}
