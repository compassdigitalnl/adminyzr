import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Set environment variable
vi.stubEnv('MINDEE_API_KEY', 'test-api-key')

const { processInvoiceOcr } = await import('@/lib/services/ocr')

describe('OCR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when API key is not set', async () => {
    vi.stubEnv('MINDEE_API_KEY', '')
    const { processInvoiceOcr: fn } = await import('@/lib/services/ocr')

    // Force re-evaluation by calling the function
    await expect(fn(Buffer.from('test'), 'test.pdf')).rejects.toThrow('MINDEE_API_KEY')
  })

  it('parses Mindee response into OcrResult', async () => {
    vi.stubEnv('MINDEE_API_KEY', 'test-api-key')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          document: {
            inference: {
              prediction: {
                supplier_name: { value: 'Acme B.V.', confidence: 0.95 },
                supplier_address: { value: 'Keizersgracht 1, Amsterdam', confidence: 0.90 },
                supplier_company_registrations: [
                  { type: 'VAT NUMBER', value: 'NL123456789B01' },
                ],
                supplier_payment_details: [{ iban: 'NL91ABNA0417164300', confidence: 0.85 }],
                invoice_number: { value: 'F-2026-0042', confidence: 0.98 },
                date: { value: '2026-03-15', confidence: 0.92 },
                due_date: { value: '2026-04-15', confidence: 0.88 },
                total_net: { value: 1500.0, confidence: 0.93 },
                total_tax: { value: 315.0, confidence: 0.91 },
                total_amount: { value: 1815.0, confidence: 0.95 },
                locale: { currency: 'EUR', language: 'nl' },
              },
            },
          },
        }),
    })

    const result = await processInvoiceOcr(Buffer.from('fake-pdf'), 'factuur.pdf')

    expect(result.confidence).toBe('high')
    expect(result.confidenceScore).toBe(95) // avg of 0.95, 0.98, 0.95, 0.92
    expect(result.data).toEqual({
      supplier: 'Acme B.V.',
      supplierVatNumber: 'NL123456789B01',
      supplierIban: 'NL91ABNA0417164300',
      invoiceNumber: 'F-2026-0042',
      issueDate: '2026-03-15',
      dueDate: '2026-04-15',
      subtotal: 150000, // in centen
      vatAmount: 31500,
      totalIncVat: 181500,
      currency: 'EUR',
    })
  })

  it('classifies low confidence correctly', async () => {
    vi.stubEnv('MINDEE_API_KEY', 'test-api-key')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          document: {
            inference: {
              prediction: {
                supplier_name: { value: 'Unknown', confidence: 0.3 },
                supplier_address: { value: null, confidence: 0 },
                supplier_company_registrations: [],
                supplier_payment_details: [],
                invoice_number: { value: null, confidence: 0.2 },
                date: { value: null, confidence: 0.1 },
                due_date: { value: null, confidence: 0 },
                total_net: { value: null, confidence: 0.4 },
                total_tax: { value: null, confidence: 0 },
                total_amount: { value: 50.0, confidence: 0.5 },
                locale: { currency: 'EUR', language: 'nl' },
              },
            },
          },
        }),
    })

    const result = await processInvoiceOcr(Buffer.from('blurry-scan'), 'scan.jpg')

    expect(result.confidence).toBe('low')
    expect(result.confidenceScore).toBeLessThan(60)
  })

  it('handles API errors', async () => {
    vi.stubEnv('MINDEE_API_KEY', 'test-api-key')

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    await expect(processInvoiceOcr(Buffer.from('test'), 'test.pdf')).rejects.toThrow(
      'Mindee API fout (401)',
    )
  })

  it('converts euros to cents correctly', async () => {
    vi.stubEnv('MINDEE_API_KEY', 'test-api-key')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          document: {
            inference: {
              prediction: {
                supplier_name: { value: 'Test', confidence: 0.9 },
                supplier_address: { value: null, confidence: 0 },
                supplier_company_registrations: [],
                supplier_payment_details: [],
                invoice_number: { value: 'T-001', confidence: 0.9 },
                date: { value: '2026-01-01', confidence: 0.9 },
                due_date: { value: null, confidence: 0 },
                total_net: { value: 99.99, confidence: 0.9 },
                total_tax: { value: 21.0, confidence: 0.9 },
                total_amount: { value: 120.99, confidence: 0.9 },
                locale: { currency: 'EUR', language: 'nl' },
              },
            },
          },
        }),
    })

    const result = await processInvoiceOcr(Buffer.from('test'), 'test.pdf')

    expect(result.data.subtotal).toBe(9999)
    expect(result.data.vatAmount).toBe(2100)
    expect(result.data.totalIncVat).toBe(12099)
  })
})
