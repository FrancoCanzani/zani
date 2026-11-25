import type { MovementKind } from "../../../../lib/revenue"
import type { Grain } from "../../sites/lib/schema"
import { bucketSize, timezoneOffsetMs } from "../../sites/lib/stats"

export type MovementRow = {
  customerId: string
  kind: string
  amount: number
  currency: string
  at: number
}

export type RevenuePoint = {
  bucket: number
  signups: number
  newMrr: number
  newCustomers: number
  mrr: number
}

export function bucketer(grain: Grain, timeZone: string | undefined) {
  const size = bucketSize(grain)
  const offset =
    timeZone && timeZone !== "UTC" ? timezoneOffsetMs(timeZone, Date.now()) : 0
  return (at: number) => Math.floor((at + offset) / size) * size - offset
}

export function primaryCurrency(
  mrrByCurrency: Array<{ currency: string; mrr: number }>,
  movements: Array<{ currency: string }>
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

export function summarize(input: {
  movements: MovementRow[]
  signups: Array<{ bucket: number; signups: number }>
  start: number
  end: number
  bucketOf: (at: number) => number
  size: number
}) {
  const { movements, start, end, bucketOf, size } = input
  const totals = emptyTotals()
  const counts = emptyTotals()
  const mrrAtStart = new Map<string, number>()
  const mrrAtEnd = new Map<string, number>()

  const points = new Map<number, RevenuePoint & { change: number }>()
  for (let bucket = bucketOf(start); bucket < end; bucket += size) {
    points.set(bucket, {
      bucket,
      signups: 0,
      newMrr: 0,
      newCustomers: 0,
      mrr: 0,
      change: 0,
    })
  }
  for (const row of input.signups) {
    const point = points.get(row.bucket)
    if (point) point.signups += row.signups
  }

  for (const row of movements) {
    if (row.at < start) {
      mrrAtStart.set(
        row.customerId,
        (mrrAtStart.get(row.customerId) ?? 0) + row.amount
      )
    }
    if (row.at >= end) continue
    mrrAtEnd.set(
      row.customerId,
      (mrrAtEnd.get(row.customerId) ?? 0) + row.amount
    )
    if (row.at < start) continue
    const kind = row.kind as MovementKind
    if (kind in totals) {
      totals[kind] += row.amount
      counts[kind] += 1
    }
    const point = points.get(bucketOf(row.at))
    if (!point) continue
    point.change += row.amount
    if (kind === "new" || kind === "reactivation") {
      point.newMrr += row.amount
      point.newCustomers += 1
    }
  }

  const sum = (values: Map<string, number>) =>
    [...values.values()].reduce((total, value) => total + value, 0)
  const mrrStart = sum(mrrAtStart)
  const mrrEnd = sum(mrrAtEnd)
  const paying = [...mrrAtEnd.values()].filter((value) => value > 0).length

  let running = mrrStart
  const series: RevenuePoint[] = []
  for (const { change, ...point } of points.values()) {
    running += change
    series.push({ ...point, mrr: running })
  }

  const churned = -totals.churn
  const contraction = -totals.contraction
  return {
    mrr: mrrEnd,
    mrrStart,
    payingCustomers: paying,
    arpa: paying > 0 ? Math.round(mrrEnd / paying) : 0,
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
    signups: input.signups.reduce((total, row) => total + row.signups, 0),
    points: series,
  }
}
