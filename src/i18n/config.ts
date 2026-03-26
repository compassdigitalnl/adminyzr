export const locales = ['nl', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'nl'

export const localeLabels: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
}

export const localeFlags: Record<Locale, string> = {
  nl: '🇳🇱',
  en: '🇬🇧',
}
