import type { CollectionBeforeValidateHook } from 'payload'
import { validateIBAN } from '@/lib/validation/iban'

/**
 * Valideert IBAN velden voordat data wordt opgeslagen.
 * Werkt voor Organizations (iban) en PurchaseInvoices (supplierIban).
 */
export const validateIban: CollectionBeforeValidateHook = async ({ data }) => {
  if (!data) return data

  // Check 'iban' field (Organizations)
  if (data.iban) {
    const result = validateIBAN(data.iban)
    if (!result.valid) {
      throw new Error(`IBAN-validatie mislukt: ${result.error}`)
    }
  }

  // Check 'supplierIban' field (PurchaseInvoices)
  if (data.supplierIban) {
    const result = validateIBAN(data.supplierIban)
    if (!result.valid) {
      throw new Error(`Leverancier IBAN-validatie mislukt: ${result.error}`)
    }
  }

  return data
}
