/**
 * MT940 parser — parst bankafschriften in SWIFT MT940 formaat.
 * Ondersteunt ook CAMT.053 (als CSV fallback).
 */

export type ParsedTransaction = {
  date: string // ISO date
  amountInCents: number // positief = credit, negatief = debit
  currency: string
  description: string
  counterpartyName?: string
  counterpartyIban?: string
  reference?: string
  externalId?: string
}

export type ParseResult = {
  transactions: ParsedTransaction[]
  accountIban?: string
  statementDate?: string
  errors: string[]
}

/**
 * Parse MT940 formatted bank statement
 */
export function parseMT940(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim())
  const transactions: ParsedTransaction[] = []
  const errors: string[] = []
  let accountIban: string | undefined
  let statementDate: string | undefined

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // :25: Account identification
    if (line.startsWith(':25:')) {
      const account = line.substring(4)
      // Could be IBAN or other format
      if (account.match(/^[A-Z]{2}\d{2}/)) {
        accountIban = account.replace(/\s/g, '')
      }
    }

    // :60F: or :60M: Opening balance (extract date)
    if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
      const balancePart = line.substring(5)
      const dateMatch = balancePart.match(/^[DC](\d{6})/)
      if (dateMatch) {
        statementDate = parseSwiftDate(dateMatch[1])
      }
    }

    // :61: Transaction line
    if (line.startsWith(':61:')) {
      try {
        const tx = parseTransactionLine(line.substring(4), lines, i)
        transactions.push(tx.transaction)
        i = tx.nextIndex
        continue
      } catch (err) {
        errors.push(`Regel ${i + 1}: ${err instanceof Error ? err.message : 'Parsefout'}`)
      }
    }

    i++
  }

  return { transactions, accountIban, statementDate, errors }
}

function parseTransactionLine(
  txLine: string,
  allLines: string[],
  currentIndex: number,
): { transaction: ParsedTransaction; nextIndex: number } {
  // MT940 :61: format: YYMMDD[MMDD]DC[amount]S[type][reference]
  // Example: 2603270327D000000001234,56NTRFNONREF
  const dateStr = txLine.substring(0, 6)
  const date = parseSwiftDate(dateStr)

  // Find D (debit) or C (credit) indicator
  let dcIndex = 6
  // Skip optional second date (4 digits)
  if (txLine.length > 10 && txLine[10] && /[DC]/.test(txLine[10])) {
    dcIndex = 10
  } else if (/[DC]/.test(txLine[dcIndex])) {
    // Already at correct position
  }

  const dcIndicator = txLine[dcIndex]
  const isCredit = dcIndicator === 'C'

  // Extract amount — find the comma-separated number
  const amountMatch = txLine.substring(dcIndex + 1).match(/(\d+,\d{2})/)
  let amountInCents = 0
  if (amountMatch) {
    amountInCents = Math.round(parseFloat(amountMatch[1].replace(',', '.')) * 100)
    if (!isCredit) amountInCents = -amountInCents
  }

  // Collect description from :86: line(s)
  let description = ''
  let counterpartyName: string | undefined
  let counterpartyIban: string | undefined
  let reference: string | undefined
  let nextIndex = currentIndex + 1

  while (nextIndex < allLines.length) {
    const nextLine = allLines[nextIndex]
    if (nextLine.startsWith(':86:')) {
      const infoText = nextLine.substring(4)
      description = infoText

      // Try to extract structured info
      // Common format: /NAME/value/IBAN/value/REMI/value
      const nameMatch = infoText.match(/\/NAME\/([^/]+)/)
      if (nameMatch) counterpartyName = nameMatch[1].trim()

      const ibanMatch = infoText.match(/\/IBAN\/([A-Z]{2}\d{2}[A-Z0-9]+)/)
      if (ibanMatch) counterpartyIban = ibanMatch[1]

      const remiMatch = infoText.match(/\/REMI\/([^/]+)/)
      if (remiMatch) reference = remiMatch[1].trim()

      // Fallback: just use the whole description
      if (!counterpartyName) {
        // Try unstructured format
        const parts = infoText.split(/\s{2,}/)
        if (parts.length >= 2) {
          counterpartyName = parts[0]
        }
      }

      nextIndex++
    } else if (nextLine.startsWith(':') || nextLine === '' || nextLine === '-') {
      break
    } else {
      // Continuation line for :86:
      description += ' ' + nextLine
      nextIndex++
    }
  }

  return {
    transaction: {
      date,
      amountInCents,
      currency: 'EUR',
      description: description || 'Geen omschrijving',
      counterpartyName,
      counterpartyIban,
      reference,
      externalId: `${date}-${Math.abs(amountInCents)}-${description.substring(0, 20)}`,
    },
    nextIndex,
  }
}

/**
 * Parse CSV bank statement (generic format)
 * Supports common Dutch bank CSV formats (ING, Rabobank, ABN AMRO)
 */
export function parseCSV(content: string, delimiter = ','): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  if (lines.length < 2) {
    return { transactions, errors: ['Bestand is leeg of heeft geen data-regels'] }
  }

  // Parse header
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim())

  // Map common column names
  const colMap = {
    date: findColumn(headers, ['datum', 'date', 'boekingsdatum', 'transactiedatum']),
    amount: findColumn(headers, ['bedrag', 'amount', 'bedrag (eur)', 'transactiebedrag']),
    description: findColumn(headers, ['omschrijving', 'description', 'naam / omschrijving', 'mededelingen']),
    counterpartyName: findColumn(headers, ['naam tegenpartij', 'tegenrekening naam', 'naam', 'counterparty']),
    counterpartyIban: findColumn(headers, ['tegenrekening', 'iban tegenpartij', 'rekening tegenpartij', 'counterparty iban']),
    debitCredit: findColumn(headers, ['af bij', 'bij/af', 'credit/debit', 'dc']),
    reference: findColumn(headers, ['kenmerk', 'referentie', 'reference', 'betalingskenmerk']),
  }

  if (colMap.date === -1) {
    errors.push('Kan kolom "datum" niet vinden. Controleer het CSV-formaat.')
    return { transactions, errors }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i], delimiter)
      if (cols.length < 2) continue

      const dateStr = cols[colMap.date] || ''
      const date = parseFlexibleDate(dateStr)
      if (!date) {
        errors.push(`Regel ${i + 1}: Ongeldige datum "${dateStr}"`)
        continue
      }

      let amountInCents = 0
      const amountStr = (cols[colMap.amount] || '0').replace(/[€\s]/g, '').replace(',', '.')
      amountInCents = Math.round(parseFloat(amountStr) * 100)

      // Handle debit/credit indicator if separate column
      if (colMap.debitCredit !== -1) {
        const dc = (cols[colMap.debitCredit] || '').toLowerCase()
        if (dc === 'af' || dc === 'debit' || dc === 'd') {
          amountInCents = -Math.abs(amountInCents)
        } else {
          amountInCents = Math.abs(amountInCents)
        }
      }

      const description = cols[colMap.description] || ''
      const counterpartyName = colMap.counterpartyName !== -1 ? cols[colMap.counterpartyName] : undefined
      const counterpartyIban = colMap.counterpartyIban !== -1 ? cols[colMap.counterpartyIban] : undefined
      const reference = colMap.reference !== -1 ? cols[colMap.reference] : undefined

      transactions.push({
        date,
        amountInCents,
        currency: 'EUR',
        description,
        counterpartyName: counterpartyName || undefined,
        counterpartyIban: counterpartyIban || undefined,
        reference: reference || undefined,
        externalId: `${date}-${amountInCents}-${i}`,
      })
    } catch {
      errors.push(`Regel ${i + 1}: Parsefout`)
    }
  }

  return { transactions, errors }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseSwiftDate(yymmdd: string): string {
  const yy = parseInt(yymmdd.substring(0, 2))
  const mm = yymmdd.substring(2, 4)
  const dd = yymmdd.substring(4, 6)
  const year = yy > 70 ? 1900 + yy : 2000 + yy
  return `${year}-${mm}-${dd}`
}

function parseFlexibleDate(dateStr: string): string | null {
  // Try common formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYYMMDD
  let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`

  match = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`

  match = dateStr.match(/^(\d{8})$/)
  if (match) return `${match[1].substring(0, 4)}-${match[1].substring(4, 6)}-${match[1].substring(6, 8)}`

  return null
}

function findColumn(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias))
    if (idx !== -1) return idx
  }
  return -1
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}
