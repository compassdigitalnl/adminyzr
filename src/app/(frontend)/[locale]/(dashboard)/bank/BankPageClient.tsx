'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getBankAccounts,
  createBankAccount,
  importBankStatement,
  autoReconcile,
  getBankTransactions,
  getReconciliationStats,
  manualMatch,
  unmatchTransaction,
  ignoreTransaction,
} from '@/lib/actions/bank'
import {
  Upload,
  Plus,
  Zap,
  Link2,
  Link2Off,
  EyeOff,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'

type BankAccount = {
  id: string
  name: string
  iban?: string
  bankName?: string
  isDefault?: boolean
  lastSyncedAt?: string
}

type Transaction = {
  id: string
  date: string
  amountInCents: number
  description: string
  counterpartyName?: string
  counterpartyIban?: string
  reference?: string
  status: string
  matchedInvoice?: { id: string; invoiceNumber?: string } | string | null
  matchConfidence?: number
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function BankPageClient() {
  const tc = useTranslations('common')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState({ unmatched: 0, autoMatched: 0, manualMatched: 0, ignored: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accs, txResult, statsResult] = await Promise.all([
        getBankAccounts(),
        getBankTransactions({ status: statusFilter === 'all' ? undefined : statusFilter }),
        getReconciliationStats(),
      ])
      setAccounts(accs as BankAccount[])
      setTransactions(txResult.docs as Transaction[])
      setStats(statsResult)
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAutoReconcile() {
    setReconcileLoading(true)
    setReconcileResult(null)
    try {
      const result = await autoReconcile()
      setReconcileResult(`${result.matched} van ${result.total} transacties automatisch gekoppeld`)
      loadData()
    } catch (err) {
      setReconcileResult(`Fout: ${err instanceof Error ? err.message : 'Onbekend'}`)
    } finally {
      setReconcileLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bank & afletteren</h1>
        <div className="flex gap-2">
          <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
            <Button variant="outline" onClick={() => setAddAccountOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Rekening
            </Button>
            <AddAccountDialog onClose={() => setAddAccountOpen(false)} onAdded={loadData} />
          </Dialog>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <Button variant="outline" onClick={() => setImportOpen(true)} disabled={accounts.length === 0}>
              <Upload className="mr-2 h-4 w-4" />
              Importeren
            </Button>
            <ImportDialog accounts={accounts} onClose={() => setImportOpen(false)} onImported={loadData} />
          </Dialog>
          <Button onClick={handleAutoReconcile} disabled={reconcileLoading || stats.unmatched === 0}>
            {reconcileLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Automatisch afletteren
          </Button>
        </div>
      </div>

      {reconcileResult && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">{reconcileResult}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="Niet gekoppeld" value={stats.unmatched} icon={<AlertCircle className="h-5 w-5 text-amber-500" />} />
        <StatsCard label="Automatisch" value={stats.autoMatched} icon={<Zap className="h-5 w-5 text-green-500" />} />
        <StatsCard label="Handmatig" value={stats.manualMatched} icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />} />
        <StatsCard label="Totaal" value={stats.total} icon={<Landmark className="h-5 w-5 text-gray-500" />} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter op status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle transacties</SelectItem>
            <SelectItem value="unmatched">Niet gekoppeld</SelectItem>
            <SelectItem value="auto_matched">Automatisch gekoppeld</SelectItem>
            <SelectItem value="manual_matched">Handmatig gekoppeld</SelectItem>
            <SelectItem value="ignored">Genegeerd</SelectItem>
          </SelectContent>
        </Select>
        {accounts.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Voeg eerst een bankrekening toe en importeer een bankafschrift (MT940 of CSV).
          </p>
        )}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-sm text-muted-foreground">{tc('loading')}</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {accounts.length === 0
              ? 'Voeg een bankrekening toe om te beginnen.'
              : 'Nog geen transacties. Importeer een bankafschrift.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Omschrijving</th>
                <th className="px-4 py-3 font-medium">Tegenpartij</th>
                <th className="px-4 py-3 font-medium text-right">Bedrag</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Acties</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onUpdated={loadData} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatsCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function TransactionRow({ tx, onUpdated }: { tx: Transaction; onUpdated: () => void }) {
  const [matchInvoiceId, setMatchInvoiceId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const isIncoming = tx.amountInCents > 0

  const statusBadge: Record<string, { label: string; variant: 'secondary' | 'success' | 'warning' | 'outline' }> = {
    unmatched: { label: 'Niet gekoppeld', variant: 'warning' },
    auto_matched: { label: 'Auto', variant: 'success' },
    manual_matched: { label: 'Handmatig', variant: 'success' },
    ignored: { label: 'Genegeerd', variant: 'secondary' },
  }

  const badge = statusBadge[tx.status] || { label: tx.status, variant: 'outline' as const }
  const matchedInvoiceNum = tx.matchedInvoice && typeof tx.matchedInvoice === 'object'
    ? tx.matchedInvoice.invoiceNumber
    : null

  async function handleMatch() {
    if (!matchInvoiceId) return
    setActionLoading(true)
    try {
      await manualMatch(tx.id, matchInvoiceId)
      setMatchInvoiceId('')
      onUpdated()
    } catch { /* ignore */ } finally {
      setActionLoading(false)
    }
  }

  async function handleUnmatch() {
    setActionLoading(true)
    try {
      await unmatchTransaction(tx.id)
      onUpdated()
    } catch { /* ignore */ } finally {
      setActionLoading(false)
    }
  }

  async function handleIgnore() {
    setActionLoading(true)
    try {
      await ignoreTransaction(tx.id)
      onUpdated()
    } catch { /* ignore */ } finally {
      setActionLoading(false)
    }
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {formatDate(tx.date)}
      </td>
      <td className="px-4 py-3">
        <div className="max-w-[250px] truncate">{tx.description}</div>
        {tx.reference && (
          <div className="text-xs text-muted-foreground truncate">Ref: {tx.reference}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{tx.counterpartyName || '-'}</div>
        {tx.counterpartyIban && (
          <div className="text-xs text-muted-foreground font-mono">{tx.counterpartyIban}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className={`flex items-center justify-end gap-1 font-medium ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
          {isIncoming ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {formatCents(tx.amountInCents)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {matchedInvoiceNum && (
            <span className="text-xs text-muted-foreground">{matchedInvoiceNum}</span>
          )}
          {tx.matchConfidence && (
            <span className="text-[10px] text-muted-foreground">({tx.matchConfidence}%)</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {tx.status === 'unmatched' && (
            <>
              <div className="flex items-center gap-1">
                <Input
                  className="h-7 w-20 text-xs"
                  placeholder="Factuur ID"
                  value={matchInvoiceId}
                  onChange={(e) => setMatchInvoiceId(e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleMatch} disabled={actionLoading || !matchInvoiceId}>
                  <Link2 className="h-3 w-3" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleIgnore} disabled={actionLoading}>
                <EyeOff className="h-3 w-3" />
              </Button>
            </>
          )}
          {(tx.status === 'auto_matched' || tx.status === 'manual_matched') && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={handleUnmatch} disabled={actionLoading}>
              <Link2Off className="h-3 w-3" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function AddAccountDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
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
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Bankrekening toevoegen</DialogTitle>
          <DialogDescription>Voeg een bankrekening toe voor het importeren van transacties.</DialogDescription>
        </DialogHeader>
        {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <div className="mt-4 space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zakelijke rekening ING" required />
          </div>
          <div>
            <Label>IBAN</Label>
            <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00 XXXX 0000 0000 00" />
          </div>
          <div>
            <Label>Bank</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="ING, Rabobank, ABN AMRO..." />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>{tc('cancel')}</Button>
          <Button type="submit" disabled={loading}>{loading ? tc('loading') : 'Toevoegen'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function ImportDialog({ accounts, onClose, onImported }: { accounts: BankAccount[]; onClose: () => void; onImported: () => void }) {
  const tc = useTranslations('common')
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    formData.append('bankAccountId', bankAccountId)

    try {
      const res = await importBankStatement(formData)
      setResult(res)
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Bankafschrift importeren</DialogTitle>
          <DialogDescription>Upload een MT940 (.sta) of CSV bestand van je bank.</DialogDescription>
        </DialogHeader>
        {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {result && (
          <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {result.imported} transacties geïmporteerd, {result.skipped} overgeslagen (duplicaten).
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc list-inside text-xs text-amber-600">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <div>
            <Label>Bankrekening *</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.name} {acc.iban ? `(${acc.iban})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bestand (.sta, .mt940, .csv) *</Label>
            <Input ref={fileRef} type="file" accept=".sta,.mt940,.csv,.txt" required />
            <p className="mt-1 text-xs text-muted-foreground">
              Ondersteunt MT940 (ING, Rabobank, ABN AMRO) en CSV formaten.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>{tc('cancel')}</Button>
          <Button type="submit" disabled={loading}>{loading ? tc('loading') : 'Importeren'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
