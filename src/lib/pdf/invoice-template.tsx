import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
  },
  companyDetails: {
    fontSize: 8,
    color: '#666',
    marginTop: 4,
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#1a1a1a',
  },
  invoiceNumber: {
    fontSize: 10,
    textAlign: 'right',
    color: '#666',
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    marginVertical: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  clientSection: {
    width: '50%',
  },
  detailsSection: {
    width: '40%',
  },
  sectionLabel: {
    fontSize: 8,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  clientName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 9,
    color: '#444',
    lineHeight: 1.4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 9,
    color: '#666',
  },
  detailValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Table
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colDescription: { width: '40%' },
  colQuantity: { width: '12%', textAlign: 'right' },
  colUnitPrice: { width: '18%', textAlign: 'right' },
  colVat: { width: '12%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 9,
  },
  // Totals
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: '#666',
  },
  totalValue: {
    fontSize: 9,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  // Notes
  notesSection: {
    marginTop: 30,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#444',
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: '#999',
    textAlign: 'center',
    lineHeight: 1.4,
  },
})

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateStr))
}

export type InvoicePdfData = {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  reference?: string
  status: string
  // Organization
  orgName: string
  orgAddress?: string
  orgKvk?: string
  orgVat?: string
  orgIban?: string
  orgEmail?: string
  orgPhone?: string
  // Client
  clientName: string
  clientAddress?: string
  clientKvk?: string
  clientVat?: string
  // Items
  items: {
    description: string
    quantity: number
    unitPrice: number
    vatRate: string
    lineTotal: number
  }[]
  // Totals
  subtotal: number
  vatAmount: number
  totalIncVat: number
  // Notes
  notes?: string
  footerText?: string
}

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{data.orgName}</Text>
            <Text style={styles.companyDetails}>
              {[data.orgAddress, data.orgKvk && `KvK: ${data.orgKvk}`, data.orgVat && `BTW: ${data.orgVat}`]
                .filter(Boolean)
                .join('\n')}
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>
              {data.status === 'credit_note' ? 'Creditnota' : 'Factuur'}
            </Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client + Details */}
        <View style={styles.row}>
          <View style={styles.clientSection}>
            <Text style={styles.sectionLabel}>Factuur aan</Text>
            <Text style={styles.clientName}>{data.clientName}</Text>
            {data.clientAddress && <Text style={styles.clientDetail}>{data.clientAddress}</Text>}
            {data.clientKvk && <Text style={styles.clientDetail}>KvK: {data.clientKvk}</Text>}
            {data.clientVat && <Text style={styles.clientDetail}>BTW: {data.clientVat}</Text>}
          </View>
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Factuurdatum:</Text>
              <Text style={styles.detailValue}>{formatDate(data.issueDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vervaldatum:</Text>
              <Text style={styles.detailValue}>{formatDate(data.dueDate)}</Text>
            </View>
            {data.reference && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Referentie:</Text>
                <Text style={styles.detailValue}>{data.reference}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>Omschrijving</Text>
            <Text style={[styles.headerText, styles.colQuantity]}>Aantal</Text>
            <Text style={[styles.headerText, styles.colUnitPrice]}>Stukprijs</Text>
            <Text style={[styles.headerText, styles.colVat]}>BTW</Text>
            <Text style={[styles.headerText, styles.colTotal]}>Totaal</Text>
          </View>

          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.cellText, styles.colQuantity]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colUnitPrice]}>{formatEuro(item.unitPrice)}</Text>
              <Text style={[styles.cellText, styles.colVat]}>
                {item.vatRate === 'exempt' ? 'Vrij' : `${item.vatRate}%`}
              </Text>
              <Text style={[styles.cellText, styles.colTotal]}>{formatEuro(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotaal</Text>
              <Text style={styles.totalValue}>{formatEuro(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>BTW</Text>
              <Text style={styles.totalValue}>{formatEuro(data.vatAmount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Totaal</Text>
              <Text style={styles.grandTotalValue}>{formatEuro(data.totalIncVat)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Opmerkingen</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {data.footerText ||
              [
                data.orgName,
                data.orgIban && `IBAN: ${data.orgIban}`,
                data.orgKvk && `KvK: ${data.orgKvk}`,
                data.orgVat && `BTW: ${data.orgVat}`,
              ]
                .filter(Boolean)
                .join(' | ')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
