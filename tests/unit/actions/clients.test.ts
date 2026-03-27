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

const { getClients, createClient, updateClient, deleteClient } =
  await import('@/lib/actions/clients')

describe('Client Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPayload.auth.mockResolvedValue({ user: mockUser })
    mockCookies.get.mockReturnValue({ value: 'test-token' })
  })

  describe('getClients', () => {
    it('fetches clients with tenant isolation', async () => {
      const clients = [{ id: 'c-1', companyName: 'Acme B.V.' }]
      mockPayload.find.mockResolvedValue(mockFindResult(clients))

      const result = await getClients()

      expect(result.docs).toHaveLength(1)
      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'clients',
          where: expect.objectContaining({
            and: expect.arrayContaining([
              { organization: { equals: 'org-1' } },
              { deletedAt: { exists: false } },
            ]),
          }),
        }),
      )
    })

    it('searches across companyName, contactName, email', async () => {
      mockPayload.find.mockResolvedValue(mockFindResult([]))

      await getClients({ search: 'acme' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            and: expect.arrayContaining([
              {
                or: [
                  { companyName: { contains: 'acme' } },
                  { contactName: { contains: 'acme' } },
                  { email: { contains: 'acme' } },
                ],
              },
            ]),
          }),
        }),
      )
    })

    it('paginates results', async () => {
      mockPayload.find.mockResolvedValue(mockFindResult([], 50))

      await getClients({ page: 2, limit: 10 })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      )
    })
  })

  describe('createClient', () => {
    it('creates client with organization', async () => {
      const data = {
        type: 'business' as const,
        companyName: 'Nieuwe B.V.',
        email: 'info@nieuwe.nl',
      }

      await createClient(data)

      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'clients',
          data: expect.objectContaining({
            companyName: 'Nieuwe B.V.',
            email: 'info@nieuwe.nl',
            organization: 'org-1',
          }),
        }),
      )
    })
  })

  describe('updateClient', () => {
    it('partially updates client', async () => {
      await updateClient('c-1', { companyName: 'Updated B.V.' })

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'clients',
          id: 'c-1',
          data: { companyName: 'Updated B.V.' },
        }),
      )
    })
  })

  describe('deleteClient', () => {
    it('soft-deletes client', async () => {
      await deleteClient('c-1')

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'clients',
          id: 'c-1',
          data: expect.objectContaining({ deletedAt: expect.any(String) }),
        }),
      )
    })
  })
})
