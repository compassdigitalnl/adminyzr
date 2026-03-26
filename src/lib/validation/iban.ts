/**
 * IBAN validatie volgens ISO 13616.
 * Controleert lengte, format en modulo 97 check digit.
 */

const IBAN_LENGTHS: Record<string, number> = {
  AL: 28, AD: 28, AT: 20, AZ: 28, BH: 22, BY: 28, BE: 16, BA: 20,
  BR: 29, BG: 22, CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28,
  TL: 23, EG: 29, SV: 28, EE: 20, FO: 18, FI: 18, FR: 27, GE: 22,
  DE: 22, GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IQ: 23,
  IE: 22, IL: 23, IT: 27, JO: 30, KZ: 20, XK: 20, KW: 30, LV: 21,
  LB: 28, LY: 25, LI: 21, LT: 20, LU: 20, MK: 19, MT: 31, MR: 27,
  MU: 30, MC: 27, MD: 24, ME: 22, NL: 18, NO: 15, PK: 24, PS: 29,
  PL: 28, PT: 25, QA: 29, RO: 24, LC: 32, SM: 27, ST: 25, SA: 24,
  RS: 22, SC: 31, SK: 24, SI: 19, ES: 24, SD: 18, SE: 24, CH: 21,
  TN: 24, TR: 26, UA: 29, AE: 23, GB: 22, VA: 22, VG: 24,
}

function mod97(iban: string): number {
  // Move first 4 chars to end, convert letters to numbers
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0)
      return code >= 65 && code <= 90 ? String(code - 55) : c
    })
    .join('')

  // Calculate mod 97 in chunks to avoid BigInt issues
  let remainder = 0
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i])) % 97
  }
  return remainder
}

export function validateIBAN(iban: string): { valid: boolean; error?: string } {
  if (!iban) return { valid: true } // Optional field

  // Remove spaces and convert to uppercase
  const clean = iban.replace(/\s/g, '').toUpperCase()

  // Check basic format
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) {
    return { valid: false, error: 'Ongeldig IBAN-formaat' }
  }

  // Check country-specific length
  const country = clean.slice(0, 2)
  const expectedLength = IBAN_LENGTHS[country]
  if (expectedLength && clean.length !== expectedLength) {
    return { valid: false, error: `IBAN voor ${country} moet ${expectedLength} tekens zijn` }
  }

  // Modulo 97 check
  if (mod97(clean) !== 1) {
    return { valid: false, error: 'IBAN check digit is ongeldig' }
  }

  return { valid: true }
}

/**
 * Format IBAN met spaties per 4 tekens.
 */
export function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.replace(/(.{4})/g, '$1 ').trim()
}
