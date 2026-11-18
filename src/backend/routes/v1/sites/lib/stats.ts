import type { AnyColumn, SQL } from "drizzle-orm"
import { eq, sql } from "drizzle-orm"

import { event } from "../../../../db/schema"

import type { Breakdown, FilterKey, Grain } from "./schema"

const maxRangeMs = 31 * 24 * 60 * 60 * 1000
const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

export type StatsRange = {
  start: number
  end: number
  grain: Grain
}

export function parseRange(input: {
  start: string
  end: string
  grain?: Grain
}): { ok: true; range: StatsRange } | { ok: false; message: string } {
  const start = Date.parse(input.start)
  const end = Date.parse(input.end)
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { ok: false, message: "end must be after start." }
  }
  if (end - start > maxRangeMs) {
    return { ok: false, message: "The range can be at most 31 days." }
  }
  return { ok: true, range: { start, end, grain: input.grain ?? "day" } }
}

export function bucketSize(grain: Grain): number {
  switch (grain) {
    case "hour":
      return hourMs
    case "day":
      return dayMs
    default: {
      const exhaustive: never = grain
      return exhaustive
    }
  }
}

export function seriesColumn(
  breakdown: Breakdown | undefined
): AnyColumn | null {
  switch (breakdown) {
    case undefined:
    case "entry":
    case "exit":
      return null
    case "path":
      return event.path
    case "referrer":
      return event.referrerHost
    case "country":
      return event.country
    case "city":
      return event.city
    case "browser":
      return event.browser
    case "device":
      return event.device
    case "os":
      return event.os
    case "screen":
      return event.screen
    case "event":
      return event.name
    case "utm_source":
      return event.utmSource
    case "utm_medium":
      return event.utmMedium
    case "utm_campaign":
      return event.utmCampaign
    case "utm_content":
      return event.utmContent
    case "utm_term":
      return event.utmTerm
    default: {
      const exhaustive: never = breakdown
      return exhaustive
    }
  }
}

function filterColumn(key: FilterKey): AnyColumn {
  switch (key) {
    case "path":
      return event.path
    case "referrer":
      return event.referrerHost
    case "country":
      return event.country
    case "city":
      return event.city
    case "browser":
      return event.browser
    case "device":
      return event.device
    case "os":
      return event.os
    case "screen":
      return event.screen
    case "utm_source":
      return event.utmSource
    case "utm_medium":
      return event.utmMedium
    case "utm_campaign":
      return event.utmCampaign
    case "utm_content":
      return event.utmContent
    case "utm_term":
      return event.utmTerm
    default: {
      const exhaustive: never = key
      return exhaustive
    }
  }
}

export function filterConditions(
  filters: Partial<Record<FilterKey, string | undefined>>
): SQL[] {
  const conditions: SQL[] = []
  for (const key of [
    "path",
    "referrer",
    "country",
    "city",
    "browser",
    "device",
    "os",
    "screen",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ] as const) {
    if (filters[key] === undefined) continue
    conditions.push(eq(filterColumn(key), filters[key]))
  }
  return conditions
}

export function bucketSql(grain: Grain, timeZone?: string) {
  const size = bucketSize(grain)
  if (!timeZone || timeZone === "UTC") {
    // D1 binds numbers as floats, so divide-then-multiply needs an explicit floor.
    return sql<number>`cast((${event.timestamp} / ${size}) as integer) * ${size}`
  }
  const offsetMs = timezoneOffsetMs(timeZone, Date.now())
  return sql<number>`cast(((${event.timestamp} + ${offsetMs}) / ${size}) as integer) * ${size} - ${offsetMs}`
}

export function timezoneOffsetMs(timeZone: string, atMs: number): number {
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
    return sign * (hours * hourMs + minutes * 60_000)
  } catch {
    return 0
  }
}

export function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
