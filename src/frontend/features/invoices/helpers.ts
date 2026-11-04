export type LineItem = {
  id: string
  productId: string | null
  name: string
  description: string
  quantity: number
  unitAmountCents: number
}

export function lineTotalCents(item: LineItem) {
  return Math.round(item.quantity * item.unitAmountCents)
}

export function subtotalCents(items: LineItem[]) {
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

export function invoiceTotals(
  items: LineItem[],
  taxRateBps: number,
  taxInclusive: boolean,
  amountPaidCents = 0
) {
  const subtotal = subtotalCents(items)
  const tax = taxCents(subtotal, taxRateBps, taxInclusive)
  const total = totalCents(subtotal, tax, taxInclusive)
  return {
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: total,
    balanceCents: Math.max(0, total - amountPaidCents),
  }
}

export function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function formatTaxRate(taxRateBps: number) {
  const value = taxRateBps / 100
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2)}%`
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2)
}

export function inputToCents(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "")
  if (!cleaned) {
    return 0
  }
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return Math.round(amount * 100)
}

export function percentToBps(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "")
  if (!cleaned) {
    return 0
  }
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return Math.min(10_000, Math.round(amount * 100))
}

export function bpsToPercentInput(bps: number) {
  return (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)
}

export function newLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    name: "",
    description: "",
    quantity: 1,
    unitAmountCents: 0,
  }
}

export const DUE_PRESET_DAYS = [0, 7, 14, 30, 60] as const

export function duePresetLabel(days: number) {
  return days === 0 ? "Due on receipt" : `Net ${days}`
}

function isoToUtcMs(iso: string) {
  return Date.parse(`${iso}T00:00:00Z`)
}

export function addDaysIso(iso: string, days: number) {
  const ms = isoToUtcMs(iso)
  if (Number.isNaN(ms)) {
    return iso
  }
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10)
}

export function matchingDuePreset(issueDate: string, dueDate: string) {
  if (!issueDate || !dueDate) {
    return null
  }
  const days = Math.round(
    (isoToUtcMs(dueDate) - isoToUtcMs(issueDate)) / 86_400_000
  )
  return DUE_PRESET_DAYS.find((preset) => preset === days) ?? null
}

export function formatLongDate(iso: string | null) {
  if (!iso) {
    return null
  }
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function formatQuantity(quantity: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    quantity
  )
}

export function formatDisplayDate(iso: string | null) {
  if (!iso) {
    return null
  }
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}
