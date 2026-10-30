import type { InvoiceLineItem, InvoiceStatus } from "../../../../db/schema"

import { invoiceTotals } from "./helpers"

export function serializeInvoice(row: {
  id: string
  workspaceId: string
  publicSlug: string
  status: InvoiceStatus
  number: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  customerAddress: string | null
  customerTaxId: string | null
  currency: string
  issueDate: string
  dueDate: string | null
  paymentTerms: string | null
  notes: string | null
  terms: string | null
  bankDetails: string | null
  taxName: string | null
  taxRateBps: number
  taxInclusive: boolean
  lineItems: InvoiceLineItem[]
  amountPaidCents: number
  createdByUserId: string | null
  sentAt: number | null
  paidAt: number | null
  createdAt: number
  updatedAt: number
}) {
  const totals = invoiceTotals(
    row.lineItems,
    row.taxRateBps,
    row.taxInclusive,
    row.amountPaidCents
  )

  const notesParts = [row.notes, row.terms]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    publicSlug: row.publicSlug,
    status: row.status,
    number: row.number,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerAddress: row.customerAddress,
    customerTaxId: row.customerTaxId,
    currency: row.currency,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    paymentTerms: row.paymentTerms,
    notes: notesParts.length > 0 ? notesParts.join("\n\n") : null,
    bankDetails: row.bankDetails,
    taxName: row.taxName,
    taxRateBps: row.taxRateBps,
    taxInclusive: row.taxInclusive,
    lineItems: row.lineItems,
    amountPaidCents: row.amountPaidCents,
    ...totals,
    createdByUserId: row.createdByUserId,
    sentAt: row.sentAt,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeInvoiceSummary(row: {
  id: string
  publicSlug: string
  status: InvoiceStatus
  number: string
  customerName: string
  currency: string
  issueDate: string
  dueDate: string | null
  lineItems: InvoiceLineItem[]
  taxRateBps: number
  taxInclusive: boolean
  amountPaidCents: number
  updatedAt: number
  createdAt: number
}) {
  const totals = invoiceTotals(
    row.lineItems,
    row.taxRateBps,
    row.taxInclusive,
    row.amountPaidCents
  )

  return {
    id: row.id,
    publicSlug: row.publicSlug,
    status: row.status,
    number: row.number,
    customerName: row.customerName,
    currency: row.currency,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    ...totals,
    amountPaidCents: row.amountPaidCents,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  }
}
