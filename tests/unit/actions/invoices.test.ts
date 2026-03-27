import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPayload, createMockCookies, mockUser, mockFindResult } from '../../helpers/mocks'

// Mock dependencies before importing actions
const mockPayload = createMockPayload()
const mockCookies = createMockCookies()

vi.mock('@/lib/get-payload', () => ({
  getPayloadClient: vi.fn(() => Promise.resolve(mockPayload)),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import after mocks
const { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoice, getDashboardStats } =
  await import('@/lib/actions/invoices')

describe('Invoice Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPayload.auth.mockResolvedValue({ user: mockUser })
    mockPayload.find.mockResolvedValue(mockFindResult([]))
  })

  describe('getInvoices', () => {
    it('throws when not authenticated', async () => {
      mockCookies.get.mockReturnValue(undefined)
      await expect(getInvoices()).rejects.toThrow('Niet ingelogd')
    })

    it('fetches invoices for authenticated user', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-token' })
      const invoices = [{ id: 'inv-1', invoiceNumber: 'INV-2026-0001', status: 'draft' }]
      mockPayload.find.mockResolvedValue(mockFindResult(invoices))

      const result = await getInvoices()

      expect(result.docs).toHaveLength(1)
      expect(result.docs[0].id).toBe('inv-1')
      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'invoices',
          where: expect.objectContaining({
            and: expect.arrayContaining([
              { organization: { equals: 'org-1' } },
              { deletedAt: { exists: false } },
            ]),
          }),
        }),
      )
    })

    it('filters by status', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-token' })
      mockPayload.find.mockResolvedValue(mockFindResult([]))

      await getInvoices({ status: 'paid' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            and: expect.arrayContaining([{ status: { equals: 'paid' } }]),
          }),
        }),
      )
    })

    it('filters by search', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-token' })
      mockPayload.find.mockResolvedValue(mockFindResult([]))

      await getInvoices({ search: 'INV-2026' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            and: expect.arrayContaining([
              { or: [{ invoiceNumber: { contains: 'INV-2026' } }] },
            ]),
          }),
        }),
      )
    })

    it('does not filter by status when "all"', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-token' })
      mockPayload.find.mockResolvedValue(mockFindResult([]))

      await getInvoices({ status: 'all' })

      const call = mockPayload.find.mock.calls[0][0]
      const conditions = call.where.and
      const statusCondition = conditions.find(
        (c: Record<string, unknown>) => 'status' in c,
      )
      expect(statusCondition).toBeUndefined()
    })
  })

  describe('createInvoice', () => {
    beforeEach(() => {
      mockCookies.get.mockReturnValue({ value: 'test-token' })
      mockPayload.findByID.mockResolvedValue({
        id: 'org-1',
        invoiceSettings: { prefix: 'INV', nextNumber: 5 },
      })
    })

    it('creates invoice with auto-generated number', async () => {
      const data = {
        client: 'client-1',
        issueDate: '2026-03-27',
        dueDate: '2026-04-27',
        items: [{ description: 'Webdesign', quantity: 10, unitPrice: 7500, vatRate: '21' as const }],
      }

      const result = await createInvoice(data)

      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'invoices',
          data: expect.objectContaining({
            organization: 'org-1',
            invoiceNumber: `INV-${new Date().getFullYear()}-0005`,
            client: 'client-1',
            status: 'draft',
          }),
        }),
      )

      // Should increment the counter
      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'organizations',
          id: 'org-1',
          data: expect.objectContaining({
            invoiceSettings: expect.objectContaining({ nextNumber: 6 }),
          }),
        }),
      )
    })

    it('creates invoice items for each line', async () => {
      const data = {
        client: 'client-1',
        issueDate: '2026-03-27',
        dueDate: '2026-04-27',
        items: [
          { description: 'Item A', quantity: 1, unitPrice: 5000, vatRate: '21' as const },
          { description: 'Item B', quantity: 2, unitPrice: 3000, vatRate: '9' as const },
        ],
      }

      await createInvoice(data)

      // 1 invoice + 1 org update + 2 items = create called 3 times (invoice + 2 items)
      const createCalls = mockPayload.create.mock.calls
      const itemCalls = createCalls.filter(
        (c: unknown[]) => (c[0] as Record<string, unknown>).collection === 'invoice-items',
      )
      expect(itemCalls).toHaveLength(2)
      expect((itemCalls[0][0] as Record<string, unknown>).data).toEqual(
        expect.objectContaining({ description: 'Item A', sortOrder: 0 }),
      )
      expect((itemCalls[1][0] as Record<string, unknown>).data).toEqual(
        expect.objectContaining({ description: 'Item B', sortOrder: 1 }),
      )
    })

    it('throws when not authenticated', async () => {
      mockCookies.get.mockReturnValue(undefined)
      await expect(
        createInvoice({
          client: 'c-1',
          issueDate: '2026-01-01',
          dueDate: '2026-02-01',
          items: [],
        }),
      ).rejects.toThrow('Niet ingelogd')
    })
  })

  describe('updateInvoiceStatus', () => {
    it('sets sentAt when marking as sent', async () => {
      await updateInvoiceStatus('inv-1', 'sent')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'invoices',
          id: 'inv-1',
          data: expect.objectContaining({
            status: 'sent',
            sentAt: expect.any(String),
          }),
        }),
      )
    })

    it('sets paidAt when marking as paid', async () => {
      await updateInvoiceStatus('inv-1', 'paid')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'paid',
            paidAt: expect.any(String),
          }),
        }),
      )
    })

    it('does not set timestamps for draft status', async () => {
      await updateInvoiceStatus('inv-1', 'draft')

      const call = mockPayload.update.mock.calls[0][0]
      expect(call.data).toEqual({ status: 'draft' })
    })
  })

  describe('deleteInvoice', () => {
    it('soft-deletes draft invoices', async () => {
      mockPayload.findByID.mockResolvedValue({ id: 'inv-1', status: 'draft' })

      await deleteInvoice('inv-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'invoices',
          id: 'inv-1',
          data: expect.objectContaining({ deletedAt: expect.any(String) }),
        }),
      )
    })

    it('refuses to delete non-draft invoices', async () => {
      mockPayload.findByID.mockResolvedValue({ id: 'inv-1', status: 'sent' })

      await expect(deleteInvoice('inv-1')).rejects.toThrow(
        'Alleen conceptfacturen kunnen verwijderd worden',
      )
    })
  })

  describe('getDashboardStats', () => {
    it('returns aggregate stats', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-token' })

      // Mock the 4 parallel queries + 1 recent invoices query
      mockPayload.find
        .mockResolvedValueOnce(mockFindResult([{ totalIncVat: 10000 }, { totalIncVat: 15000 }]))
        .mockResolvedValueOnce(mockFindResult([{ totalIncVat: 5000 }]))
        .mockResolvedValueOnce(mockFindResult([{ totalIncVat: 3000 }]))
        .mockResolvedValueOnce({ ...mockFindResult([]), totalDocs: 12 })
        .mockResolvedValueOnce(mockFindResult([{ id: 'inv-1', invoiceNumber: 'INV-2026-0001' }]))

      const stats = await getDashboardStats()

      expect(stats.revenueThisMonth).toBe(25000)
      expect(stats.outstandingTotal).toBe(5000)
      expect(stats.overdueTotal).toBe(3000)
      expect(stats.totalClients).toBe(12)
      expect(stats.recentInvoices).toHaveLength(1)
    })
  })
})
