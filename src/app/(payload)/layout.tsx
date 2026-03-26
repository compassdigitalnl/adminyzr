import type { Metadata } from 'next'
import config from '@payload-config'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import React from 'react'
import { importMap } from './admin/importMap'

import '@payloadcms/next/css'

export const metadata: Metadata = {
  title: 'Admin | Adminyzr',
}

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={handleServerFunctions as unknown as Parameters<typeof RootLayout>[0]['serverFunction']}>
    {children}
  </RootLayout>
)

export default Layout
