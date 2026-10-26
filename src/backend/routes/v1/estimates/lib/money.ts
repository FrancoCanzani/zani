import type { EstimateLineItem } from "../../../../db/schema"

export function lineTotalCents(item: EstimateLineItem) {
  return Math.round(item.quantity * item.unitAmountCents)
}

export function subtotalCents(items: EstimateLineItem[]) {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0)
}

export function depositCents(subtotal: number, depositPercent: number) {
  return Math.round((subtotal * depositPercent) / 100)
}
