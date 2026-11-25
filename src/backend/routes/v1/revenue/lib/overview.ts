import type { MovementKind } from "../../../../lib/revenue"

import type { RevenueRange } from "./schema"

const dayMs = 24 * 60 * 60 * 1000
const maxPoints = 180

export type MovementRow = {
  customerId: string
  kind: string
  amount: number
  currency: string
  at: number
}

export function rangeStart(range: RevenueRange, now: number, earliest: number) {
  switch (range) {
    case "30d":
      return now - 30 * dayMs
    case "90d":
      return now - 90 * dayMs
    case "12m":
      return now - 365 * dayMs
    case "all":
      return Math.min(earliest, now - 30 * dayMs)
    default: {
      const exhaustive: never = range
      return exhaustive
    }
  }
}

export function primaryCurrency(
  mrrByCurrency: Array<{ currency: string; mrr: number }>,
  movements: MovementRow[]
) {
  const ranked = mrrByCurrency
    .filter((row) => row.currency)
    .sort((a, b) => b.mrr - a.mrr)
  if (ranked[0]) return ranked[0].currency
  const counts = new Map<string, number>()
  for (const row of movements) {
    counts.set(row.currency, (counts.get(row.currency) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "usd"
}

function emptyTotals(): Record<MovementKind, number> {
  return { new: 0, expansion: 0, contraction: 0, churn: 0, reactivation: 0 }
}

export function summarize(
  movements: MovementRow[],
  start: number,
  end: number
) {
  const totals = emptyTotals()
  const counts = emptyTotals()
  let mrrStart = 0
  let mrrEnd = 0

  const span = Math.max(dayMs, end - start)
  const bucket = Math.max(dayMs, Math.ceil(span / maxPoints / dayMs) * dayMs)
  const firstBucket = Math.floor(start / dayMs) * dayMs
  const points: Array<{
    at: number
    mrr: number
    gained: number
    lost: number
  }> = []
  for (let at = firstBucket; at < end; at += bucket) {
    points.push({ at, mrr: 0, gained: 0, lost: 0 })
  }

  for (const row of movements) {
    if (row.at < start) mrrStart += row.amount
    if (row.at < end) mrrEnd += row.amount
    if (row.at < start || row.at >= end) continue
    const kind = row.kind as MovementKind
    if (kind in totals) {
      totals[kind] += row.amount
      counts[kind] += 1
    }
    const index = Math.min(
      points.length - 1,
      Math.floor((row.at - firstBucket) / bucket)
    )
    const point = points[index]
    if (!point) continue
    if (row.amount > 0) point.gained += row.amount
    else point.lost += row.amount
  }

  let running = mrrStart
  for (const point of points) {
    running += point.gained + point.lost
    point.mrr = running
  }

  const churned = -totals.churn
  const contraction = -totals.contraction
  return {
    mrr: mrrEnd,
    mrrStart,
    newMrr: totals.new + totals.reactivation,
    expansionMrr: totals.expansion,
    contractionMrr: contraction,
    churnedMrr: churned,
    netNewMrr: mrrEnd - mrrStart,
    newCustomers: counts.new + counts.reactivation,
    churnedCustomers: counts.churn,
    revenueChurnRate:
      mrrStart > 0
        ? Math.round(((churned + contraction) / mrrStart) * 1000) / 10
        : 0,
    points,
  }
}
