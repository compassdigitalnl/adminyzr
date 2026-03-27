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

  // Check of er velden gewijzigd worden die niet mogen
  if (!data) return data

  const mutatedFields = Object.keys(data).filter(
    (key) => !ALLOWED_FIELDS_AFTER_SEND.includes(key)
  )

  if (mutatedFields.length > 0) {
    throw new Error(
      `Factuur ${originalDoc.invoiceNumber} is al verstuurd en kan niet meer gewijzigd worden. ` +
      `Maak een creditnota aan. Geblokkeerde velden: ${mutatedFields.join(', ')}`
    )
  }

  return data
}
