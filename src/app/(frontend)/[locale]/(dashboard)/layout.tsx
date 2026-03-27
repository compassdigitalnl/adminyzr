'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { ThemeProvider } from '@/components/ThemeProvider'
import { CommandPalette } from '@/components/CommandPalette'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <CommandPalette />
      <div className="flex min-h-screen bg-[var(--bg-base)]">
        <Sidebar />
        <main className="ml-sidebar flex flex-1 flex-col min-h-screen">
          <DashboardHeader />
          <div className="flex-1 p-6 max-w-content">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
