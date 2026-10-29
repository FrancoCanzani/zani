import type { InvoiceLineItem } from "../../../../db/schema"

export function lineTotalCents(item: InvoiceLineItem) {
  return Math.round(item.quantity * item.unitAmountCents)
}

export function subtotalCents(items: InvoiceLineItem[]) {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0)
}

export function taxCents(
  subtotal: number,
  taxRateBps: number,
  taxInclusive: boolean
) {
  if (taxRateBps <= 0 || subtotal <= 0) {
    return 0
  }
  if (taxInclusive) {
    return Math.round((subtotal * taxRateBps) / (10_000 + taxRateBps))
  }
  return Math.round((subtotal * taxRateBps) / 10_000)
}

export function totalCents(
  subtotal: number,
  tax: number,
  taxInclusive: boolean
) {
  if (taxInclusive) {
    return subtotal
  }
  return subtotal + tax
}

export function balanceCents(total: number, amountPaidCents: number) {
  return Math.max(0, total - amountPaidCents)
}

export function invoiceTotals(
  items: InvoiceLineItem[],
  taxRateBps: number,
  taxInclusive: boolean,
  amountPaidCents: number
) {
  const subtotal = subtotalCents(items)
  const tax = taxCents(subtotal, taxRateBps, taxInclusive)
  const total = totalCents(subtotal, tax, taxInclusive)
  return {
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: total,
    balanceCents: balanceCents(total, amountPaidCents),
  }
}
