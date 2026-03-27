'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { processOcrUpload, type OcrProcessResult } from '@/lib/actions/ocr'

type OcrUploadProps = {
  onResult: (result: OcrProcessResult) => void
}

export function OcrUpload({ onResult }: OcrUploadProps) {
  const t = useTranslations('purchaseInvoices.ocr')
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const handleFile = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError('')

      const formData = new FormData()
      formData.append('file', file)

      try {
        const result = await processOcrUpload(formData)
        if (!result.success && result.error) {
          setError(result.error)
        }
        onResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'))
      } finally {
        setProcessing(false)
      }
    },
    [onResult, t],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${processing ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-primary/50'}`}
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={processing}
        />

        {processing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('processing')}
          </div>
        ) : (
          <>
            <svg className="mb-2 h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium">{t('dropzone')}</p>
            <p className="text-xs text-muted-foreground">{t('maxSize')}</p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
    </div>
  )
}

type OcrConfidenceBadgeProps = {
  confidence: 'high' | 'medium' | 'low'
  score: number
}

export function OcrConfidenceBadge({ confidence, score }: OcrConfidenceBadgeProps) {
  const t = useTranslations('purchaseInvoices.ocr')

  const colors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  }

  const labels = {
    high: t('confidenceHigh'),
    medium: t('confidenceMedium'),
    low: t('confidenceLow'),
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors[confidence]}`}>
      <span>{labels[confidence]}</span>
      <span className="opacity-60">({score}%)</span>
    </div>
  )
}
