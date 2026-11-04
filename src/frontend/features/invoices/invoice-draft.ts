import type { Invoice, InvoiceInput } from "./api"
import type { LineItem } from "./helpers"

export type BillTo = {
  customerId: string | null
  name: string
  email: string
  phone: string
  address: string
  taxId: string
}

export type InvoiceDraft = {
  number: string
  issueDate: string
  dueDate: string
  currency: string
  memo: string
  bankDetails: string
  taxName: string
  taxRateBps: number
  taxInclusive: boolean
  lineItems: LineItem[]
  billTo: BillTo
}

export function draftFromInvoice(invoice: Invoice): InvoiceDraft {
  return {
    number: invoice.number,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate ?? "",
    currency: invoice.currency,
    memo: invoice.notes ?? "",
    bankDetails: invoice.bankDetails ?? "",
    taxName: invoice.taxName ?? "",
    taxRateBps: invoice.taxRateBps,
    taxInclusive: invoice.taxInclusive,
    lineItems: invoice.lineItems,
    billTo: {
      customerId: invoice.customerId,
      name: invoice.customerName,
      email: invoice.customerEmail ?? "",
      phone: invoice.customerPhone ?? "",
      address: invoice.customerAddress ?? "",
      taxId: invoice.customerTaxId ?? "",
    },
  }
}

export function inputFromDraft(
  draft: InvoiceDraft,
  paymentTerms: string | null
): InvoiceInput {
  return {
    number: draft.number.trim(),
    customerId: draft.billTo.customerId,
    customerName: draft.billTo.name.trim(),
    customerPhone: draft.billTo.phone.trim() || null,
    customerEmail: draft.billTo.email.trim() || null,
    customerAddress: draft.billTo.address.trim() || null,
    customerTaxId: draft.billTo.taxId.trim() || null,
    currency: draft.currency,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate || null,
    paymentTerms,
    notes: draft.memo.trim() || null,
    bankDetails: draft.bankDetails.trim() || null,
    taxName: draft.taxName.trim() || null,
    taxRateBps: draft.taxRateBps,
    taxInclusive: draft.taxInclusive,
    lineItems: draft.lineItems
      .filter(
        (item) =>
          item.name.trim() ||
          item.description.trim() ||
          item.unitAmountCents > 0
      )
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        description: item.description.trim(),
        quantity: item.quantity > 0 ? item.quantity : 1,
        unitAmountCents: Math.max(0, Math.round(item.unitAmountCents)),
      })),
  }
}
