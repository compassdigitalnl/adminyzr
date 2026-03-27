import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPayload, createMockCookies, mockUser, mockFindResult } from '../../helpers/mocks'

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

const { createQuote, convertQuoteToInvoice, deleteQuote } =
  await import('@/lib/actions/quotes')

describe('Quote Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPayload.auth.mockResolvedValue({ user: mockUser })
    mockCookies.get.mockReturnValue({ value: 'test-token' })
  })

  describe('createQuote', () => {
    it('calculates VAT correctly', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 'org-1',
        invoiceSettings: { prefix: 'INV', nextNumber: 1 },
      })
      mockPayload.find.mockResolvedValue({ ...mockFindResult([]), totalDocs: 0 })

      const data = {
        client: 'c-1',
        issueDate: '2026-03-27',
        validUntil: '2026-04-27',
        items: [
          { description: 'Design', quantity: 10, unitPrice: 10000, vatRate: '21' as const },
          { description: 'Hosting', quantity: 12, unitPrice: 2500, vatRate: '9' as const },
        ],
      }

      await createQuote(data)

      // Design: 10 * 10000 = 100000, VAT: 21000
      // Hosting: 12 * 2500 = 30000, VAT: 2700
      // Total subtotal: 130000, Total VAT: 23700, Total inc VAT: 153700
      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'quotes',
          data: expect.objectContaining({
            subtotal: 130000,
            vatAmount: 23700,
            totalIncVat: 153700,
            status: 'draft',
          }),
        }),
      )
    })

    it('generates quote number with OFF prefix', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 'org-1',
        invoiceSettings: { prefix: 'CD', nextNumber: 1 },
      })
      mockPayload.find.mockResolvedValue({ ...mockFindResult([]), totalDocs: 3 })

      await createQuote({
        client: 'c-1',
        issueDate: '2026-03-27',
        validUntil: '2026-04-27',
        items: [{ description: 'Test', quantity: 1, unitPrice: 1000, vatRate: '21' as const }],
      })

      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quoteNumber: expect.stringContaining('CD-'),
          }),
        }),
      )
    })
  })

  describe('convertQuoteToInvoice', () => {
    it('converts accepted quote to draft invoice', async () => {
      mockPayload.findByID
        .mockResolvedValueOnce({
          id: 'q-1',
          status: 'accepted',
          client: 'c-1',
          subtotal: 50000,
          vatAmount: 10500,
          totalIncVat: 60500,
          notes: 'Some notes',
        })
        .mockResolvedValueOnce({
          id: 'org-1',
          invoiceSettings: { prefix: 'INV', nextNumber: 10 },
        })

      await convertQuoteToInvoice('q-1')

      // Should create invoice
      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'invoices',
          data: expect.objectContaining({
            client: 'c-1',
            status: 'draft',
            subtotal: 50000,
            vatAmount: 10500,
            totalIncVat: 60500,
            linkedQuote: 'q-1',
          }),
        }),
      )

      // Should update org counter
      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'organizations',
          data: expect.objectContaining({
            invoiceSettings: expect.objectContaining({ nextNumber: 11 }),
          }),
        }),
      )
    })

    it('rejects non-accepted quotes', async () => {
      mockPayload.findByID.mockResolvedValue({ id: 'q-1', status: 'draft' })

      await expect(convertQuoteToInvoice('q-1')).rejects.toThrow(
        'Alleen geaccepteerde offertes kunnen omgezet worden naar facturen',
      )
    })
  })

  describe('deleteQuote', () => {
    it('soft-deletes quote', async () => {
      await deleteQuote('q-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'quotes',
          id: 'q-1',
          data: expect.objectContaining({ deletedAt: expect.any(String) }),
        }),
      )
    })
  })
})
