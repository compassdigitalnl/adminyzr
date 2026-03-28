'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getBankAccounts,
  createBankAccount,
  deleteBankAccount,
} from '@/lib/actions/bank'
import { Plus, Trash2, Landmark, Star } from 'lucide-react'

type BankAccount = {
  id: string
  name: string
  iban?: string
  bankName?: string
  isDefault?: boolean
  lastSyncedAt?: string
}

export function BankAccountsTab() {
  const tc = useTranslations('common')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBankAccounts()
      setAccounts(data as BankAccount[])
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  async function handleDelete(id: string) {
    if (!confirm('Bankrekening verwijderen?')) return
    await deleteBankAccount(id)
    loadAccounts()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Bankrekeningen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Beheer je bankrekeningen voor het importeren van transacties en automatisch afletteren.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Rekening toevoegen
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{tc('loading')}</div>
        ) : accounts.length === 0 ? (
          <div className="py-8 text-center">
            <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nog geen bankrekeningen. Voeg een rekening toe om bankafschriften te importeren.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Landmark className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{acc.name}</span>
                      {acc.isDefault && <Badge variant="success"><Star className="mr-1 h-3 w-3" />Standaard</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {acc.iban && <span className="font-mono">{acc.iban}</span>}
                      {acc.bankName && <span>{acc.bankName}</span>}
                      {acc.lastSyncedAt && <span>Laatste sync: {new Date(acc.lastSyncedAt).toLocaleDateString('nl-NL')}</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(acc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddBankAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={loadAccounts}
      />
    </div>
  )
}

function AddBankAccountDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: () => void }) {
  const tc = useTranslations('common')
  const [name, setName] = useState('')
  const [iban, setIban] = useState('')
  const [bankName, setBankName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createBankAccount({ name, iban: iban || undefined, bankName: bankName || undefined, isDefault: true })
      onAdded()
      onOpenChange(false)
      setName(''); setIban(''); setBankName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Bankrekening toevoegen</DialogTitle>
            <DialogDescription>Voeg een bankrekening toe voor het importeren van transacties.</DialogDescription>
          </DialogHeader>
          {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="mt-4 space-y-4">
            <div><Label>Naam *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zakelijke rekening ING" required /></div>
            <div><Label>IBAN</Label><Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00 XXXX 0000 0000 00" /></div>
            <div><Label>Bank</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="ING, Rabobank, ABN AMRO..." /></div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
            <Button type="submit" disabled={loading}>{loading ? tc('loading') : 'Toevoegen'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
