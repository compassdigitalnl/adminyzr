import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Adminyzr',
  description: 'Business Operations Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
