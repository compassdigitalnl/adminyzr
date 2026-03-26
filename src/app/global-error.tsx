'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Er is iets misgegaan</h1>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Er is een onverwachte fout opgetreden. Probeer het opnieuw.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              backgroundColor: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  )
}
