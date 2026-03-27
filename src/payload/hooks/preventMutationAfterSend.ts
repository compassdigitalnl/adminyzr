import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Voorkomt wijzigingen aan facturen die al verstuurd zijn.
 * Facturen zijn juridische documenten: na versturen NIET meer muteren.
 * Alleen status en paidAt/remindersSent mogen nog gewijzigd worden.
 */
const ALLOWED_FIELDS_AFTER_SEND = ['status', 'paidAt', 'remindersSent', 'updatedAt', 'paymentUrl', 'paymentProvider', 'paymentExternalId']

export const preventMutationAfterSend: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== 'update' || !originalDoc) return data

  // Alleen blokkeren als factuur al verstuurd is
  if (!originalDoc.sentAt) return data

  // Check of er velden daadwerkelijk gewijzigd worden die niet mogen
  if (!data) return data

  const mutatedFields = Object.keys(data).filter((key) => {
    // Allowed fields mogen altijd gewijzigd worden
    if (ALLOWED_FIELDS_AFTER_SEND.includes(key)) return false

    // Check of de waarde daadwerkelijk gewijzigd is
    const oldVal = originalDoc[key]
    const newVal = data[key]

    // Vergelijk als JSON voor objecten/arrays, anders directe vergelijking
    if (typeof oldVal === 'object' && oldVal !== null) {
      return JSON.stringify(oldVal) !== JSON.stringify(newVal)
    }

    return oldVal !== newVal
  })

  if (mutatedFields.length > 0) {
    throw new Error(
      `Factuur ${originalDoc.invoiceNumber} is al verstuurd en kan niet meer gewijzigd worden. ` +
      `Maak een creditnota aan. Geblokkeerde velden: ${mutatedFields.join(', ')}`
    )
  }

  return data
}
