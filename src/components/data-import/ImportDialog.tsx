'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { importClients, importProducts } from '@/lib/actions/data-import'
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  type: 'clients' | 'products'
  onImported: () => void
}

export function ImportDialog({ open, onOpenChange, type, onImported }: Props) {
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: { row: number; error: string }[] } | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const labels = {
    clients: {
      title: 'Klanten importeren',
      description: 'Upload een CSV-bestand met klantgegevens. Kolommen: Bedrijfsnaam, Contactpersoon, Email, Telefoon, KvK-nummer, BTW-nummer, Straat, Huisnummer, Postcode, Plaats.',
      template: 'Bedrijfsnaam;Contactpersoon;Email;Telefoon;KvK-nummer;BTW-nummer;Straat;Huisnummer;Postcode;Plaats',
    },
    products: {
      title: 'Producten importeren',
      description: 'Upload een CSV-bestand met productgegevens. Kolommen: Naam, SKU, Omschrijving, Prijs (excl. BTW), BTW-tarief.',
      template: 'Naam;SKU;Omschrijving;Prijs;BTW-tarief',
    },
  }

  const info = labels[type]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Selecteer een bestand')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = type === 'clients'
        ? await importClients(formData)
        : await importProducts(formData)
      setResult(res)
      if (res.imported > 0) onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([info.template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setError('') } }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {info.title}
            </DialogTitle>
            <DialogDescription>{info.description}</DialogDescription>
          </DialogHeader>

          {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          {result && (
            <div className="mt-4 rounded-md bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{result.imported} geïmporteerd, {result.skipped} overgeslagen</span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{result.errors.length} fouten:</p>
                  <ul className="text-xs text-amber-600 list-disc list-inside max-h-24 overflow-y-auto">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>Rij {e.row}: {e.error}</li>
                    ))}
                    {result.errors.length > 10 && <li>...en {result.errors.length - 10} meer</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <Label>CSV-bestand *</Label>
              <Input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" required className="mt-1" />
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-primary hover:underline"
            >
              Download voorbeeld CSV template
            </button>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importeren
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
