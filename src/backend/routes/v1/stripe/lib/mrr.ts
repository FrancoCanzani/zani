const mrrStatuses = new Set(["active", "trialing", "past_due"])

export function isMrrStatus(status: string) {
  return mrrStatuses.has(status)
}

export function subscriptionMrrCents(input: {
  unitAmount: number | null | undefined
  quantity: number | null | undefined
  interval: string | null | undefined
  intervalCount: number | null | undefined
}) {
  const unit = input.unitAmount ?? 0
  if (!Number.isFinite(unit) || unit <= 0) return 0
  const quantity =
    input.quantity && Number.isFinite(input.quantity) && input.quantity > 0
      ? input.quantity
      : 1
  const amount = unit * quantity
  const count =
    input.intervalCount &&
    Number.isFinite(input.intervalCount) &&
    input.intervalCount > 0
      ? input.intervalCount
      : 1
  const interval = (input.interval ?? "").toLowerCase()
  switch (interval) {
    case "day":
      return Math.round((amount * 365.25) / (12 * count))
    case "week":
      return Math.round((amount * 52) / (12 * count))
    case "month":
      return Math.round(amount / count)
    case "year":
      return Math.round(amount / (12 * count))
    default:
      return 0
  }
}
