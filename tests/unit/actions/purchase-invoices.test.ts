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

const {
  getPurchaseInvoices,
  createPurchaseInvoice,
  approvePurchaseInvoice,
  rejectPurchaseInvoice,
  markPurchaseInvoicePaid,
  deletePurchaseInvoice,
} = await import('@/lib/actions/purchase-invoices')

describe('Purchase Invoice Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPayload.auth.mockResolvedValue({ user: mockUser })
    mockCookies.get.mockReturnValue({ value: 'test-token' })
  })

  describe('getPurchaseInvoices', () => {
    it('fetches with tenant isolation', async () => {
      mockPayload.find.mockResolvedValue(mockFindResult([]))

      await getPurchaseInvoices()

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'purchase-invoices',
          where: expect.objectContaining({
            and: expect.arrayContaining([
              { organization: { equals: 'org-1' } },
            ]),
          }),
        }),
      )
    })

    it('filters by status and search', async () => {
      mockPayload.find.mockResolvedValue(mockFindResult([]))

      await getPurchaseInvoices({ status: 'pending_review', search: 'Leverancier' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            and: expect.arrayContaining([
              { status: { equals: 'pending_review' } },
              { or: [
                { supplier: { contains: 'Leverancier' } },
                { invoiceNumber: { contains: 'Leverancier' } },
              ] },
            ]),
          }),
        }),
      )
    })
  })

  describe('createPurchaseInvoice', () => {
    it('creates with pending_review status', async () => {
      const data = {
        supplier: 'Leverancier B.V.',
        subtotal: 50000,
        vatAmount: 10500,
        totalIncVat: 60500,
        category: 'software',
      }

      await createPurchaseInvoice(data)

      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'purchase-invoices',
          data: expect.objectContaining({
            organization: 'org-1',
            supplier: 'Leverancier B.V.',
            status: 'pending_review',
            category: 'software',
          }),
        }),
      )
    })

    it('defaults category to other', async () => {
      await createPurchaseInvoice({
        supplier: 'Test',
        subtotal: 1000,
        vatAmount: 210,
        totalIncVat: 1210,
      })

      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: 'other' }),
        }),
      )
    })
  })

  describe('approval workflow', () => {
    it('approves with user and timestamp', async () => {
      await approvePurchaseInvoice('pi-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pi-1',
          data: expect.objectContaining({
            status: 'approved',
            approvedBy: 'user-1',
            approvedAt: expect.any(String),
          }),
        }),
      )
    })

    it('rejects purchase invoice', async () => {
      await rejectPurchaseInvoice('pi-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pi-1',
          data: expect.objectContaining({ status: 'rejected' }),
        }),
      )
    })

    it('marks as paid with timestamp', async () => {
      await markPurchaseInvoicePaid('pi-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pi-1',
          data: expect.objectContaining({
            status: 'paid',
            paidAt: expect.any(String),
          }),
        }),
      )
    })
  })

  describe('deletePurchaseInvoice', () => {
    it('soft-deletes', async () => {
      await deletePurchaseInvoice('pi-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pi-1',
          data: expect.objectContaining({ deletedAt: expect.any(String) }),
        }),
      )
    })
  })
})
