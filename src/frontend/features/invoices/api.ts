import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

import type { LineItem } from "./helpers"

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "void"

export type InvoiceSummary = {
  id: string
  publicSlug: string
  status: InvoiceStatus
  number: string
  customerName: string
  currency: string
  issueDate: string
  dueDate: string | null
  subtotalCents: number
  taxCents: number
  totalCents: number
  balanceCents: number
  amountPaidCents: number
  updatedAt: number
  createdAt: number
}

export type Invoice = {
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
  taxName: string | null
  taxRateBps: number
  taxInclusive: boolean
  lineItems: LineItem[]
  amountPaidCents: number
  subtotalCents: number
  taxCents: number
  totalCents: number
  balanceCents: number
  createdByUserId: string | null
  sentAt: number | null
  paidAt: number | null
  createdAt: number
  updatedAt: number
}

export type InvoiceInput = {
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
  taxName: string | null
  taxRateBps: number
  taxInclusive: boolean
  lineItems: LineItem[]
}

export function invoicesQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["invoices", slug] as const,
    queryFn: async () =>
      requireJson<{ invoices: InvoiceSummary[] }>(
        await api.workspaces[":slug"].invoices.$get({
          param: { slug },
        }),
        "invoices"
      ),
  })
}

export function invoiceQueryOptions(slug: string, invoiceId: string) {
  return queryOptions({
    queryKey: ["invoice", slug, invoiceId] as const,
    queryFn: async () =>
      requireJson<{ invoice: Invoice }>(
        await api.workspaces[":slug"].invoices[":invoiceId"].$get({
          param: { slug, invoiceId },
        }),
        "invoice"
      ),
  })
}

export async function createInvoice(slug: string) {
  const response = await api.workspaces[":slug"].invoices.$post({
    param: { slug },
  })
  if (!response.ok) {
    throw new Error("Could not create the invoice.")
  }
  return requireJson<{ invoice: Invoice }>(response, "invoice")
}

export async function updateInvoice(
  slug: string,
  invoiceId: string,
  body: InvoiceInput
) {
  const response = await api.workspaces[":slug"].invoices[":invoiceId"].$patch({
    param: { slug, invoiceId },
    json: body,
  })
  if (response.status === 409) {
    throw new Error("This invoice can no longer be edited.")
  }
  if (response.status === 404) {
    throw new Error("Customer not found.")
  }
  if (!response.ok) {
    throw new Error("Could not save the invoice.")
  }
  return requireJson<{ invoice: Invoice }>(response, "invoice")
}

export async function discardInvoice(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[
    ":invoiceId"
  ].$delete({
    param: { slug, invoiceId },
  })
  if (response.status === 409) {
    throw new Error("Only draft invoices can be discarded.")
  }
  if (response.status === 404) {
    throw new Error("Invoice not found.")
  }
  if (!response.ok) {
    throw new Error("Could not discard the invoice.")
  }
}

export async function sendInvoice(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[
    ":invoiceId"
  ].send.$post({
    param: { slug, invoiceId },
  })
  if (response.status === 400) {
    throw new Error("Add a customer before sending.")
  }
  if (response.status === 409) {
    throw new Error("Only draft invoices can be sent.")
  }
  if (!response.ok) {
    throw new Error("Could not send the invoice.")
  }
  return requireJson<{ invoice: Invoice }>(response, "invoice")
}

export async function markInvoicePaid(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[
    ":invoiceId"
  ]["mark-paid"].$post({
    param: { slug, invoiceId },
  })
  if (response.status === 409) {
    throw new Error("This invoice cannot be marked paid.")
  }
  if (!response.ok) {
    throw new Error("Could not mark the invoice paid.")
  }
  return requireJson<{ invoice: Invoice }>(response, "invoice")
}
