import { z } from "zod"

export const rangePresets = ["1d", "7d", "30d", "90d", "12m", "custom"] as const
export const metrics = [
  "visitors",
  "views",
  "bounce",
  "signups",
  "new_mrr",
  "mrr",
] as const
export const attributionDimensions = [
  "source",
  "medium",
  "campaign",
  "landing",
] as const
export const touches = ["first", "last"] as const
export const filterKeys = [
  "source",
  "path",
  "referrer",
  "referrer_path",
  "country",
  "city",
  "browser",
  "device",
  "os",
  "screen",
  "event",
  "prop",
  "prop_value",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const

export type RangePreset = (typeof rangePresets)[number]
export type Metric = (typeof metrics)[number]
export type FilterKey = (typeof filterKeys)[number]
export type AttributionDimension = (typeof attributionDimensions)[number]
export type Touch = (typeof touches)[number]
export type Grain = "minute" | "hour" | "day" | "week"

export const siteSearchSchema = z.object({
  range: z.enum(rangePresets).default("30d"),
  metric: z.enum(metrics).default("visitors"),
  by: z.enum(attributionDimensions).default("source"),
  touch: z.enum(touches).default("first"),
  from: z.string().optional(),
  to: z.string().optional(),
  tz: z.string().default("UTC"),
  compare: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  bots: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  live: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  source: z.string().optional(),
  path: z.string().optional(),
  referrer: z.string().optional(),
  referrer_path: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  browser: z.string().optional(),
  device: z.string().optional(),
  os: z.string().optional(),
  screen: z.string().optional(),
  event: z.string().optional(),
  prop: z.string().optional(),
  prop_value: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
})

export type SiteSearch = z.infer<typeof siteSearchSchema>

export const hourMs = 60 * 60 * 1000
export const dayMs = 24 * hourMs

export function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms))
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN)
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  }
}

export function zonedOffsetMs(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(new Date(ms))
  const raw = parts.find((part) => part.type === "timeZoneName")?.value
  if (!raw || raw === "GMT" || raw === "UTC") return 0
  const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return 0
  const sign = match[1] === "-" ? -1 : 1
  const hours = Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)
  return sign * (hours * hourMs + minutes * 60_000)
}

function zonedDateUtcMs(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  return utcGuess - zonedOffsetMs(utcGuess, timeZone)
}

function grainFor(durationMs: number): Grain {
  if (durationMs <= dayMs) return "hour"
  if (durationMs <= 92 * dayMs) return "day"
  return "week"
}

const presetDays: Record<Exclude<RangePreset, "custom">, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
}

export function rangeFromSearch(search: SiteSearch): {
  start: string
  end: string
  grain: Grain
} {
  const timeZone = search.tz || "UTC"
  if (search.range === "custom" && search.from && search.to) {
    const from = parseDateInput(search.from)
    const to = parseDateInput(search.to)
    if (from && to) {
      const startMs = zonedDateUtcMs(
        timeZone,
        from.year,
        from.month,
        from.day,
        from.hour,
        from.minute,
        0
      )
      const endMs = to.hasTime
        ? zonedDateUtcMs(
            timeZone,
            to.year,
            to.month,
            to.day,
            to.hour,
            to.minute,
            0
          ) + 60_000
        : zonedDateUtcMs(timeZone, to.year, to.month, to.day, 0, 0, 0) + dayMs
      return {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        grain: grainFor(endMs - startMs),
      }
    }
  }

  const now = Date.now()
  const parts = zonedParts(now, timeZone)
  const endMs =
    search.range === "1d"
      ? zonedDateUtcMs(
          timeZone,
          parts.year,
          parts.month,
          parts.day,
          parts.hour + 1,
          0,
          0
        )
      : zonedDateUtcMs(
          timeZone,
          parts.year,
          parts.month,
          parts.day + 1,
          0,
          0,
          0
        )
  const days = presetDays[search.range === "custom" ? "30d" : search.range]
  return {
    start: new Date(endMs - days * dayMs).toISOString(),
    end: new Date(endMs).toISOString(),
    grain: grainFor(days * dayMs),
  }
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(
    value.trim()
  )
  if (!match) return null
  const hasTime = match[4] !== undefined && match[5] !== undefined
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: hasTime ? Number(match[4]) : 0,
    minute: hasTime ? Number(match[5]) : 0,
    hasTime,
  }
}

const liveWindowMs = 30 * 60_000
export const liveTickMs = 10_000

export function liveRange(now: number) {
  const endMs = Math.ceil(now / liveTickMs) * liveTickMs
  return {
    start: new Date(endMs - liveWindowMs).toISOString(),
    end: new Date(endMs).toISOString(),
    grain: "minute" as const,
  }
}

export function filtersFromSearch(
  search: SiteSearch
): Partial<Record<FilterKey, string>> {
  const filters: Partial<Record<FilterKey, string>> = {}
  for (const key of filterKeys) {
    if (search[key] !== undefined) filters[key] = search[key]
  }
  return filters
}

export function dependentFilters(key: FilterKey): Partial<SiteSearch> {
  switch (key) {
    case "referrer":
      return { referrer_path: undefined }
    case "event":
      return { prop: undefined, prop_value: undefined }
    case "prop":
      return { prop_value: undefined }
    case "source":
    case "path":
    case "referrer_path":
    case "country":
    case "city":
    case "browser":
    case "device":
    case "os":
    case "screen":
    case "prop_value":
    case "utm_source":
    case "utm_medium":
    case "utm_campaign":
    case "utm_content":
    case "utm_term":
      return {}
    default: {
      const exhaustive: never = key
      return exhaustive
    }
  }
}

export function activeFilterChips(search: SiteSearch) {
  return filterKeys.flatMap((key) => {
    if (search[key] === undefined) return []
    return [{ key, value: search[key] as string }]
  })
}

export const filterLabels: Record<FilterKey, string> = {
  source: "Channel",
  path: "Page",
  referrer: "Referrer",
  referrer_path: "Referrer path",
  country: "Country",
  city: "City",
  browser: "Browser",
  device: "Device",
  os: "OS",
  screen: "Screen",
  event: "Event",
  prop: "Property",
  prop_value: "Property value",
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
  utm_content: "UTM content",
  utm_term: "UTM term",
}

export const metricLabels: Record<Metric, string> = {
  visitors: "Visitors",
  views: "Pageviews",
  bounce: "Bounce rate",
  signups: "Signups",
  new_mrr: "New MRR",
  mrr: "MRR",
}

export const rangeLabels: Record<RangePreset, string> = {
  "1d": "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
  custom: "Custom",
}

export type TrafficMetric = "visitors" | "views"
export type RevenueMetric = "signups" | "new_mrr" | "mrr"

export function chartSeriesFor(metric: Metric): {
  bars: TrafficMetric
  line: RevenueMetric
} {
  switch (metric) {
    case "visitors":
    case "views":
      return { bars: metric, line: "new_mrr" }
    case "signups":
    case "new_mrr":
    case "mrr":
      return { bars: "visitors", line: metric }
    case "bounce":
      return { bars: "visitors", line: "new_mrr" }
    default: {
      const exhaustive: never = metric
      return exhaustive
    }
  }
}
