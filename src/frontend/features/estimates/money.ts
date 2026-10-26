export type LineItem = {
  id: string
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

export function depositCents(subtotal: number, depositPercent: number) {
  return Math.round((subtotal * depositPercent) / 100)
}

export function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
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

export function newLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitAmountCents: 0,
  }
}
