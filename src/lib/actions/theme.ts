'use server'

import { cookies } from 'next/headers'

export type Theme = 'light' | 'dark' | 'system'

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies()
  return (cookieStore.get('theme')?.value as Theme) || 'system'
}

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies()
  cookieStore.set('theme', theme, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'lax',
  })
}
