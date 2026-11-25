import type { AnyColumn, SQL } from "drizzle-orm"
import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm"

import { event, eventProp } from "../../../../db/schema"
import type { createDb } from "../../../../lib/db"
import { sourceFor } from "../../../../lib/source"

import {
  filterKeys,
  type Breakdown,
  type FilterKey,
  type Grain,
} from "./schema"

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs
const maxRangeMs = 400 * dayMs
const botBrowser = "bot"
const pageviewName = "pageview"
const pointLimit = 500

export type StatsRange = {
  start: number
  end: number
  grain: Grain
}

type Database = ReturnType<typeof createDb>

const dimensionColumns: Record<
  | Exclude<Breakdown, "entry" | "exit" | "source" | "prop_key" | "prop_value">
  | Exclude<FilterKey, "source">,
  AnyColumn
> = {
  path: event.path,
  referrer: event.referrerHost,
  referrer_path: event.referrerPath,
  country: event.country,
  city: event.city,
  browser: event.browser,
  device: event.device,
  os: event.os,
  screen: event.screen,
  event: event.name,
  prop: eventProp.key,
  prop_value: eventProp.value,
  utm_source: event.utmSource,
  utm_medium: event.utmMedium,
  utm_campaign: event.utmCampaign,
  utm_content: event.utmContent,
  utm_term: event.utmTerm,
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
    return { ok: false, message: "The range can be at most 400 days." }
  }
  return { ok: true, range: { start, end, grain: input.grain ?? "day" } }
}

export function bucketSize(grain: Grain): number {
  switch (grain) {
    case "minute":
      return 60_000
    case "hour":
      return hourMs
    case "day":
      return dayMs
    case "week":
      return 7 * dayMs
    default: {
      const exhaustive: never = grain
      return exhaustive
    }
  }
}

function seriesColumn(breakdown: Breakdown | undefined): AnyColumn | null {
  if (
    breakdown === undefined ||
    breakdown === "entry" ||
    breakdown === "exit" ||
    breakdown === "source" ||
    breakdown === "prop_key" ||
    breakdown === "prop_value"
  ) {
    return null
  }
  return dimensionColumns[breakdown]
}

function isPropBreakdown(
  breakdown: Breakdown | undefined
): breakdown is "prop_key" | "prop_value" {
  return breakdown === "prop_key" || breakdown === "prop_value"
}

function isCustomEventBreakdown(breakdown: Breakdown | undefined) {
  return (
    breakdown === "event" ||
    breakdown === "prop_key" ||
    breakdown === "prop_value"
  )
}

export function filterConditions(
  filters: Partial<Record<FilterKey, string | undefined>>
): SQL[] {
  const conditions: SQL[] = []
  for (const key of filterKeys) {
    const value = filters[key]
    if (value === undefined) continue
    if (key === "source" || key === "prop" || key === "prop_value") continue
    conditions.push(eq(dimensionColumns[key], value))
  }
  return conditions
}

export function propFilterConditions(
  filters: Partial<Record<FilterKey, string | undefined>>
): SQL[] {
  const conditions: SQL[] = []
  if (filters.prop !== undefined) {
    conditions.push(eq(eventProp.key, filters.prop))
  }
  if (filters.prop_value !== undefined) {
    conditions.push(eq(eventProp.value, filters.prop_value))
  }
  return conditions
}

export function trafficConditions(input: {
  breakdown: Breakdown | undefined
  eventFilter: string | undefined
  includeBots: boolean
}): SQL[] {
  const conditions: SQL[] = []
  if (!input.includeBots) {
    conditions.push(ne(event.browser, botBrowser))
  }
  if (input.eventFilter !== undefined) return conditions
  conditions.push(
    isCustomEventBreakdown(input.breakdown)
      ? ne(event.name, pageviewName)
      : eq(event.name, pageviewName)
  )
  return conditions
}

export function bucketSql(
  grain: Grain,
  timeZone?: string,
  column: AnyColumn = event.timestamp
) {
  const size = bucketSize(grain)
  if (!timeZone || timeZone === "UTC") {
    // D1 binds numbers as floats, so divide-then-multiply needs an explicit floor.
    return sql<number>`cast((${column} / ${size}) as integer) * ${size}`
  }
  const offsetMs = timezoneOffsetMs(timeZone, Date.now())
  return sql<number>`cast(((${column} + ${offsetMs}) / ${size}) as integer) * ${size} - ${offsetMs}`
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

export function siteWhere(
  siteId: string,
  range: StatsRange,
  query: Partial<Record<FilterKey, string | undefined>> & {
    breakdown?: Breakdown
    event?: string
    bots?: string
  },
  extra: SQL[] = []
) {
  return and(
    eq(event.siteId, siteId),
    gte(event.timestamp, range.start),
    lt(event.timestamp, range.end),
    ...filterConditions(query),
    ...extra,
    ...trafficConditions({
      breakdown: query.breakdown,
      eventFilter: query.event,
      includeBots: query.bots === "1",
    })
  )
}

// Channels come from a regex over referrer hosts, so resolve the matching hosts first.
export async function sourceCondition(
  db: Database,
  siteId: string,
  range: StatsRange,
  source: string
): Promise<SQL> {
  if (source === "direct") {
    return and(eq(event.utmSource, ""), eq(event.referrerHost, ""))!
  }
  const hosts = await db
    .selectDistinct({ host: event.referrerHost })
    .from(event)
    .where(
      and(
        eq(event.siteId, siteId),
        gte(event.timestamp, range.start),
        lt(event.timestamp, range.end),
        eq(event.utmSource, ""),
        ne(event.referrerHost, "")
      )
    )
  const matching = hosts
    .map((row) => row.host)
    .filter((host) => sourceFor("", host) === source)
  const byUtm = sql`lower(${event.utmSource}) = ${source}`
  if (matching.length === 0) return byUtm
  return or(
    byUtm,
    and(eq(event.utmSource, ""), inArray(event.referrerHost, matching))
  )!
}

async function loadSourceBreakdown(
  db: Database,
  where: ReturnType<typeof and>
) {
  const rows = await db
    .select({
      utmSource: event.utmSource,
      referrerHost: event.referrerHost,
      views: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${event.visitorId})`,
      sessions: sql<number>`count(distinct ${event.sessionId})`,
    })
    .from(event)
    .where(where)
    .groupBy(event.utmSource, event.referrerHost)

  const merged = new Map<
    string,
    { series: string; views: number; visitors: number; sessions: number }
  >()
  for (const row of rows) {
    const series = sourceFor(row.utmSource, row.referrerHost)
    const current = merged.get(series) ?? {
      series,
      views: 0,
      visitors: 0,
      sessions: 0,
    }
    current.views += asNumber(row.views)
    current.visitors += asNumber(row.visitors)
    current.sessions += asNumber(row.sessions)
    merged.set(series, current)
  }
  return [...merged.values()]
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, pointLimit)
}

function needsPropJoin(
  breakdown: Breakdown | undefined,
  filters: Partial<Record<FilterKey, string | undefined>>
) {
  return (
    isPropBreakdown(breakdown) ||
    filters.prop !== undefined ||
    filters.prop_value !== undefined
  )
}

export async function loadBreakdownRows(
  db: Database,
  input: {
    breakdown: Breakdown | undefined
    where: ReturnType<typeof and>
    grain: Grain
    timeZone?: string
    filters: Partial<Record<FilterKey, string | undefined>>
  }
) {
  const { breakdown, where, grain, timeZone, filters } = input
  const views = sql<number>`count(*)`
  const visitors = sql<number>`count(distinct ${event.visitorId})`
  const sessions = sql<number>`count(distinct ${event.sessionId})`

  if (breakdown === "entry" || breakdown === "exit") {
    return loadEdgeBreakdown(db, { breakdown, where })
  }
  if (breakdown === "source") {
    return loadSourceBreakdown(db, where)
  }

  if (isPropBreakdown(breakdown)) {
    return loadPropBreakdown(db, {
      breakdown,
      where,
      filters,
    })
  }

  const column = seriesColumn(breakdown)
  const series = column ? sql<string>`${column}` : sql<string>`''`
  const bucket = bucketSql(grain, timeZone)
  const joinProps = needsPropJoin(breakdown, filters)

  if (breakdown) {
    const query = db.select({ series, views, visitors, sessions }).from(event)
    const scoped = joinProps
      ? query
          .innerJoin(eventProp, eq(eventProp.eventId, event.id))
          .where(and(where, ...propFilterConditions(filters)))
      : query.where(where)
    return scoped.groupBy(series).orderBy(desc(visitors)).limit(pointLimit)
  }

  const query = db
    .select({ bucket, series, views, visitors, sessions })
    .from(event)
  const scoped = joinProps
    ? query
        .innerJoin(eventProp, eq(eventProp.eventId, event.id))
        .where(and(where, ...propFilterConditions(filters)))
    : query.where(where)
  return scoped.groupBy(bucket, series).orderBy(asc(bucket)).limit(pointLimit)
}

async function loadPropBreakdown(
  db: ReturnType<typeof createDb>,
  input: {
    breakdown: "prop_key" | "prop_value"
    where: ReturnType<typeof and>
    filters: Partial<Record<FilterKey, string | undefined>>
  }
) {
  const series =
    input.breakdown === "prop_key"
      ? sql<string>`${eventProp.key}`
      : sql<string>`${eventProp.value}`
  const views = sql<number>`count(*)`
  const visitors = sql<number>`count(distinct ${event.visitorId})`
  const sessions = sql<number>`count(distinct ${event.sessionId})`

  return db
    .select({ series, views, visitors, sessions })
    .from(event)
    .innerJoin(eventProp, eq(eventProp.eventId, event.id))
    .where(and(input.where, ...propFilterConditions(input.filters)))
    .groupBy(series)
    .orderBy(desc(views))
    .limit(pointLimit)
}

async function loadEdgeBreakdown(
  db: Database,
  input: {
    breakdown: "entry" | "exit"
    where: ReturnType<typeof and>
  }
) {
  const edgeExpr =
    input.breakdown === "entry"
      ? sql<number>`min(${event.timestamp})`
      : sql<number>`max(${event.timestamp})`
  const edges = await db
    .select({
      sessionId: event.sessionId,
      edgeAt: edgeExpr.as("edge_at"),
    })
    .from(event)
    .where(input.where)
    .groupBy(event.sessionId)

  if (edges.length === 0) return []

  const bySession = new Map(
    edges.map((row) => [row.sessionId, asNumber(row.edgeAt)])
  )
  const pageviews = await db
    .select({
      sessionId: event.sessionId,
      path: event.path,
      timestamp: event.timestamp,
      visitorId: event.visitorId,
    })
    .from(event)
    .where(input.where)

  const counts = new Map<
    string,
    { views: number; visitors: Set<string>; sessions: Set<string> }
  >()
  for (const row of pageviews) {
    const edgeAt = bySession.get(row.sessionId)
    if (edgeAt === undefined || row.timestamp !== edgeAt) continue
    const current = counts.get(row.path) ?? {
      views: 0,
      visitors: new Set<string>(),
      sessions: new Set<string>(),
    }
    current.views += 1
    current.visitors.add(row.visitorId)
    current.sessions.add(row.sessionId)
    counts.set(row.path, current)
  }

  return [...counts.entries()]
    .map(([series, value]) => ({
      series,
      views: value.views,
      visitors: value.visitors.size,
      sessions: value.sessions.size,
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, pointLimit)
}

export { pointLimit }
