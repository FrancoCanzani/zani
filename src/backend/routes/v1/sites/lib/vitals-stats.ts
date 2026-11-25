import { and, asc, eq, gte, lt, ne } from "drizzle-orm"

import { vital } from "../../../../db/schema"
import type { createDb } from "../../../../lib/db"

import {
  vitalMetrics,
  type VitalMetric,
  type VitalRating,
} from "../../collect/lib/vitals"

import type { FilterKey, Grain } from "./schema"
import { parseRange, type StatsRange } from "./stats"

const botBrowser = "bot"
const sampleLimit = 5000
const pathLimit = 50

const vitalFilterKeys = [
  "path",
  "country",
  "city",
  "browser",
  "device",
  "os",
] as const satisfies readonly FilterKey[]

type VitalFilterKey = (typeof vitalFilterKeys)[number]

const vitalFilterColumns = {
  path: vital.path,
  country: vital.country,
  city: vital.city,
  browser: vital.browser,
  device: vital.device,
  os: vital.os,
} as const

export type VitalSummary = {
  metric: VitalMetric
  samples: number
  p75: number | null
  good: number
  needsImprovement: number
  poor: number
}

export type VitalPathRow = {
  path: string
  samples: number
  p75: number | null
  good: number
  needsImprovement: number
  poor: number
}

export type VitalPoint = {
  bucket: number
  metric: VitalMetric
  p75: number | null
  samples: number
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const rank = (p / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]!
  const weight = rank - low
  return sorted[low]! * (1 - weight) + sorted[high]! * weight
}

function roundMetric(metric: VitalMetric, value: number) {
  if (metric === "cls") return Math.round(value * 10000) / 10000
  return Math.round(value)
}

function vitalWhere(
  siteId: string,
  range: StatsRange,
  filters: Partial<Record<VitalFilterKey, string | undefined>>,
  includeBots: boolean,
  metric?: VitalMetric
) {
  const conditions = [
    eq(vital.siteId, siteId),
    gte(vital.timestamp, range.start),
    lt(vital.timestamp, range.end),
  ]
  if (metric) conditions.push(eq(vital.metric, metric))
  if (!includeBots) conditions.push(ne(vital.browser, botBrowser))
  for (const key of vitalFilterKeys) {
    const value = filters[key]
    if (value === undefined) continue
    conditions.push(eq(vitalFilterColumns[key], value))
  }
  return and(...conditions)
}

function summarize(
  metric: VitalMetric,
  values: number[],
  ratings: VitalRating[]
): VitalSummary {
  const sorted = [...values].sort((a, b) => a - b)
  const p75 = percentile(sorted, 75)
  let good = 0
  let needsImprovement = 0
  let poor = 0
  for (const rating of ratings) {
    switch (rating) {
      case "good":
        good += 1
        break
      case "needs-improvement":
        needsImprovement += 1
        break
      case "poor":
        poor += 1
        break
      default: {
        const exhaustive: never = rating
        return exhaustive
      }
    }
  }
  return {
    metric,
    samples: values.length,
    p75: p75 === null ? null : roundMetric(metric, p75),
    good,
    needsImprovement,
    poor,
  }
}

export async function loadVitalsStats(
  db: ReturnType<typeof createDb>,
  input: {
    siteId: string
    range: StatsRange
    filters: Partial<Record<VitalFilterKey, string | undefined>>
    includeBots: boolean
    grain: Grain
    timeZone?: string
    metric?: VitalMetric
  }
) {
  const where = vitalWhere(
    input.siteId,
    input.range,
    input.filters,
    input.includeBots
  )

  const rows = await db
    .select({
      metric: vital.metric,
      value: vital.value,
      rating: vital.rating,
      path: vital.path,
      timestamp: vital.timestamp,
    })
    .from(vital)
    .where(where)
    .orderBy(asc(vital.value))
    .limit(sampleLimit)

  const byMetric = new Map<
    VitalMetric,
    { values: number[]; ratings: VitalRating[] }
  >()
  for (const metric of vitalMetrics) {
    byMetric.set(metric, { values: [], ratings: [] })
  }

  const pathMetric = input.metric ?? "lcp"
  const byPath = new Map<
    string,
    { values: number[]; ratings: VitalRating[] }
  >()
  const byBucket = new Map<string, { values: number[]; metric: VitalMetric }>()
  const size =
    input.grain === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const offsetMs = timezoneOffsetMs(input.timeZone, Date.now())

  for (const row of rows) {
    if (!isVitalMetric(row.metric)) continue
    if (!isVitalRating(row.rating)) continue
    const bucket = byMetric.get(row.metric)!
    bucket.values.push(row.value)
    bucket.ratings.push(row.rating)

    if (row.metric === pathMetric) {
      const pathBucket = byPath.get(row.path) ?? { values: [], ratings: [] }
      pathBucket.values.push(row.value)
      pathBucket.ratings.push(row.rating)
      byPath.set(row.path, pathBucket)
    }

    const bucketStart =
      Math.floor((row.timestamp + offsetMs) / size) * size - offsetMs
    const key = `${row.metric}:${bucketStart}`
    const series = byBucket.get(key) ?? { values: [], metric: row.metric }
    series.values.push(row.value)
    byBucket.set(key, series)
  }

  const metrics = vitalMetrics.map((metric) => {
    const bucket = byMetric.get(metric)!
    return summarize(metric, bucket.values, bucket.ratings)
  })

  const paths = [...byPath.entries()]
    .map(([path, bucket]) => {
      const summary = summarize(pathMetric, bucket.values, bucket.ratings)
      return {
        path,
        samples: summary.samples,
        p75: summary.p75,
        good: summary.good,
        needsImprovement: summary.needsImprovement,
        poor: summary.poor,
      } satisfies VitalPathRow
    })
    .sort((a, b) => {
      if (a.p75 === null && b.p75 === null) return b.samples - a.samples
      if (a.p75 === null) return 1
      if (b.p75 === null) return -1
      return b.p75 - a.p75
    })
    .slice(0, pathLimit)

  const points: VitalPoint[] = [...byBucket.entries()]
    .map(([key, bucket]) => {
      const bucketStart = Number(key.slice(key.indexOf(":") + 1))
      const p75 = percentile(
        [...bucket.values].sort((a, b) => a - b),
        75
      )
      return {
        bucket: bucketStart,
        metric: bucket.metric,
        p75: p75 === null ? null : roundMetric(bucket.metric, p75),
        samples: bucket.values.length,
      }
    })
    .sort((a, b) => a.bucket - b.bucket || a.metric.localeCompare(b.metric))

  return {
    metrics,
    paths,
    points,
    pathMetric,
    truncated: rows.length >= sampleLimit,
  }
}

function isVitalMetric(value: string): value is VitalMetric {
  return (vitalMetrics as readonly string[]).includes(value)
}

function isVitalRating(value: string): value is VitalRating {
  return (
    value === "good" ||
    value === "needs-improvement" ||
    value === "poor"
  )
}

function timezoneOffsetMs(timeZone: string | undefined, atMs: number): number {
  if (!timeZone || timeZone === "UTC") return 0
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(new Date(atMs))
    const raw = parts.find((part) => part.type === "timeZoneName")?.value
    if (!raw || raw === "GMT" || raw === "UTC") return 0
    const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
    if (!match) return 0
    const sign = match[1] === "-" ? -1 : 1
    const hours = Number(match[2] ?? 0)
    const minutes = Number(match[3] ?? 0)
    return sign * (hours * 60 * 60 * 1000 + minutes * 60_000)
  } catch {
    return 0
  }
}

export { parseRange, vitalFilterKeys }
export type { VitalFilterKey }
