import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

import type { LineItem } from "./helpers"

export type InvoiceStatus =
  "draft" | "sent" | "partially_paid" | "paid" | "void"

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
  customerEmail: string | null
  lastRemindedAt: number | null
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
  bankDetails: string | null
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
  lastRemindedAt: number | null
  paidAt: number | null
  createdAt: number
  updatedAt: number
}

export type InvoiceInput = {
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
  notes: string | null
  bankDetails: string | null
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
    json: {},
  })
  if (response.status === 404) {
    throw new Error("Customer not found.")
  }
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
    const errorBody = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    if (errorBody?.error === "number_taken") {
      throw new Error("That invoice number is already in use.")
    }
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

export async function downloadInvoicePdf(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[
    ":invoiceId"
  ].pdf.$get({
    param: { slug, invoiceId },
  })
  if (response.status === 404) {
    throw new Error("Invoice not found.")
  }
  if (!response.ok) {
    throw new Error("Could not download the PDF.")
  }
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition")
  )
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function filenameFromDisposition(header: string | null) {
  const match = /filename="([^"]+)"/.exec(header ?? "")
  return match?.[1] || "invoice.pdf"
}

export async function deleteInvoice(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[":invoiceId"].$delete(
    {
      param: { slug, invoiceId },
    }
  )
  if (response.status === 404) {
    throw new Error("Invoice not found.")
  }
  if (!response.ok) {
    throw new Error("Could not delete the invoice.")
  }
}

export type InvoiceEmailResult = {
  invoice: Invoice
  delivered: boolean
}

export function invoiceEmailMessage(delivered: boolean, email: string) {
  if (delivered) {
    return `Emailed ${email}.`
  }
  return "Logged the email in development."
}

export async function sendInvoice(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[
    ":invoiceId"
  ].send.$post({
    param: { slug, invoiceId },
  })
  return readInvoiceEmail(response, "Could not send the invoice.")
}

export async function remindInvoice(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[
    ":invoiceId"
  ].remind.$post({
    param: { slug, invoiceId },
  })
  return readInvoiceEmail(response, "Could not send the reminder.")
}

async function readInvoiceEmail(
  response: {
    ok: boolean
    status: number
    json: () => Promise<unknown>
  },
  fallback: string
) {
  if (response.status === 401) {
    return requireJson<InvoiceEmailResult>(response, "invoice")
  }
  if (!response.ok) {
    throw new Error(await invoiceEmailError(response, fallback))
  }
  return requireJson<InvoiceEmailResult>(response, "invoice")
}

async function invoiceEmailError(
  response: { json: () => Promise<unknown> },
  fallback: string
) {
  const body = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  switch (body?.error) {
    case "customer_email_required":
      return "Add a customer email before sending."
    case "customer_required":
      return "Add a customer before sending."
    case "not_draft":
      return "Only draft invoices can be sent."
    case "not_outstanding":
      return "This invoice has nothing left to remind about."
    case "email_failed":
      return "Could not send the email."
    case "not_found":
      return "Invoice not found."
    default:
      return fallback
  }
}

export async function markInvoicePaid(slug: string, invoiceId: string) {
  const response = await api.workspaces[":slug"].invoices[":invoiceId"][
    "mark-paid"
  ].$post({
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
