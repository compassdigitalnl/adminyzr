import { vi } from 'vitest'

// Mock user with organization
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'owner',
  organization: {
    id: 'org-1',
    name: 'Test Org',
    invoiceSettings: {
      prefix: 'INV',
      nextNumber: 1,
    },
  },
}

// Mock Payload find result
export function mockFindResult(docs: Record<string, unknown>[], totalDocs?: number) {
  return {
    docs,
    totalDocs: totalDocs ?? docs.length,
    totalPages: 1,
    page: 1,
    hasNextPage: false,
    hasPrevPage: false,
  }
}

// Create a mock Payload client
export function createMockPayload() {
  return {
    auth: vi.fn().mockResolvedValue({ user: mockUser }),
    find: vi.fn().mockResolvedValue(mockFindResult([])),
    findByID: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new-1', ...data })),
    update: vi.fn().mockImplementation(({ id, data }) => Promise.resolve({ id, ...data })),
    delete: vi.fn().mockResolvedValue({ id: 'del-1' }),
  }
}

// Mock next/headers cookies
export function createMockCookies(token = 'test-jwt-token') {
  return {
    get: vi.fn((name: string) => {
      if (name === 'payload-token') return { value: token }
      return undefined
    }),
    set: vi.fn(),
    delete: vi.fn(),
  }
}
