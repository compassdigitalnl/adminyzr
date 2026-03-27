/**
 * Matching engine — koppelt banktransacties aan facturen.
 *
 * Matching strategieën (in volgorde van betrouwbaarheid):
 * 1. Exact bedrag + factuurnummer in omschrijving (score 95-100)
 * 2. Exact bedrag + IBAN match met klant (score 80-90)
 * 3. Exact bedrag + naam match met klant (score 60-75)
 * 4. Fuzzy bedrag match + referentie (score 40-55)
 */

type MatchCandidate = {
  invoiceId: string
  invoiceNumber: string
  totalIncVat: number
  clientName?: string
  clientIban?: string
  type: 'invoice' | 'purchase_invoice'
}

export type MatchResult = {
  invoiceId: string
  invoiceType: 'invoice' | 'purchase_invoice'
  confidence: number
  reason: string
}

export function findBestMatch(
  transaction: {
    amountInCents: number
    description: string
    counterpartyName?: string
    counterpartyIban?: string
    reference?: string
  },
  candidates: MatchCandidate[],
): MatchResult | null {
  const matches: (MatchResult & { score: number })[] = []

  const txAmount = Math.abs(transaction.amountInCents)
  const txDesc = (transaction.description || '').toLowerCase()
  const txRef = (transaction.reference || '').toLowerCase()
  const txCounterparty = (transaction.counterpartyName || '').toLowerCase()
  const txIban = (transaction.counterpartyIban || '').toUpperCase().replace(/\s/g, '')
  const combinedText = `${txDesc} ${txRef}`

  for (const candidate of candidates) {
    const candidateAmount = Math.abs(candidate.totalIncVat)
    let score = 0
    const reasons: string[] = []

    // ─── Bedrag match ──────────────────────────────────────────────
    const amountMatch = txAmount === candidateAmount
    const amountClose = Math.abs(txAmount - candidateAmount) <= 1 // 1 cent tolerance

    if (!amountMatch && !amountClose) continue // Bedrag moet matchen

    if (amountMatch) {
      score += 40
      reasons.push('exact bedrag')
    } else {
      score += 35
      reasons.push('bedrag (±1 cent)')
    }

    // ─── Factuurnummer in omschrijving ─────────────────────────────
    const invNum = candidate.invoiceNumber.toLowerCase()
    // Check with and without prefix
    const invNumClean = invNum.replace(/[^a-z0-9]/g, '')

    if (combinedText.includes(invNum) || combinedText.includes(invNumClean)) {
      score += 55
      reasons.push('factuurnummer in omschrijving')
    } else {
      // Try partial match — just the numeric part
      const numericPart = invNum.replace(/[^0-9]/g, '')
      if (numericPart.length >= 4 && combinedText.includes(numericPart)) {
        score += 30
        reasons.push('factuurnummer (gedeeltelijk)')
      }
    }

    // ─── IBAN match ────────────────────────────────────────────────
    if (txIban && candidate.clientIban) {
      const candidateIban = candidate.clientIban.toUpperCase().replace(/\s/g, '')
      if (txIban === candidateIban) {
        score += 25
        reasons.push('IBAN match')
      }
    }

    // ─── Naam match ────────────────────────────────────────────────
    if (txCounterparty && candidate.clientName) {
      const candidateName = candidate.clientName.toLowerCase()
      if (txCounterparty.includes(candidateName) || candidateName.includes(txCounterparty)) {
        score += 15
        reasons.push('naam match')
      } else {
        // Fuzzy: check if significant words match
        const txWords = txCounterparty.split(/\s+/).filter((w) => w.length > 2)
        const nameWords = candidateName.split(/\s+/).filter((w) => w.length > 2)
        const matchedWords = txWords.filter((w) => nameWords.some((nw) => nw.includes(w) || w.includes(nw)))
        if (matchedWords.length > 0 && matchedWords.length >= nameWords.length * 0.5) {
          score += 10
          reasons.push('naam (gedeeltelijk)')
        }
      }
    }

    // Minimum score threshold
    if (score >= 40) {
      matches.push({
        invoiceId: candidate.invoiceId,
        invoiceType: candidate.type,
        confidence: Math.min(score, 100),
        reason: reasons.join(' + '),
        score,
      })
    }
  }

  if (matches.length === 0) return null

  // Return best match
  matches.sort((a, b) => b.score - a.score)
  const best = matches[0]

  return {
    invoiceId: best.invoiceId,
    invoiceType: best.invoiceType,
    confidence: best.confidence,
    reason: best.reason,
  }
}
