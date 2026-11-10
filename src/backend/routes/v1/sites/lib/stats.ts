import type { AnyColumn } from "drizzle-orm"
import { sql } from "drizzle-orm"

import { event } from "../../../../db/schema"

import type { Breakdown, Grain } from "./schema"

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
      return null
    case "path":
      return event.path
    case "referrer":
      return event.referrerHost
    case "country":
      return event.country
    case "browser":
      return event.browser
    case "device":
      return event.device
    case "event":
      return event.name
    default: {
      const exhaustive: never = breakdown
      return exhaustive
    }
  }
}

export function bucketSql(grain: Grain) {
  const size = bucketSize(grain)
  return sql<number>`(${event.timestamp} / ${size}) * ${size}`
}

export function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
