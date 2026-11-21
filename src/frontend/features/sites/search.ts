import { z } from "zod"

export const rangePresets = ["1d", "7d", "30d", "custom"] as const
export const metrics = [
  "views",
  "visitors",
  "sessions",
  "bounce",
  "views_per_visit",
] as const
export const filterKeys = [
  "path",
  "referrer",
  "country",
  "city",
  "browser",
  "device",
  "os",
  "screen",
  "event",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const

export type RangePreset = (typeof rangePresets)[number]
export type Metric = (typeof metrics)[number]
export type FilterKey = (typeof filterKeys)[number]

export const siteSearchSchema = z.object({
  range: z.enum(rangePresets).default("7d"),
  metric: z.enum(metrics).default("views"),
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
  path: z.string().optional(),
  referrer: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  browser: z.string().optional(),
  device: z.string().optional(),
  os: z.string().optional(),
  screen: z.string().optional(),
  event: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
})

export type SiteSearch = z.infer<typeof siteSearchSchema>

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

function zonedParts(ms: number, timeZone: string) {
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

function zonedOffsetMs(ms: number, timeZone: string) {
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

export function rangeFromSearch(search: SiteSearch): {
  start: string
  end: string
  grain: "hour" | "day"
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
      const duration = endMs - startMs
      return {
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        grain: duration <= dayMs ? "hour" : "day",
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
      : zonedDateUtcMs(timeZone, parts.year, parts.month, parts.day + 1, 0, 0, 0)
  const days = search.range === "1d" ? 1 : search.range === "30d" ? 30 : 7
  return {
    start: new Date(endMs - days * dayMs).toISOString(),
    end: new Date(endMs).toISOString(),
    grain: days <= 1 ? "hour" : "day",
  }
}

function parseDateInput(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(value.trim())
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

export function filtersFromSearch(
  search: SiteSearch
): Partial<Record<FilterKey, string>> {
  const filters: Partial<Record<FilterKey, string>> = {}
  for (const key of filterKeys) {
    if (search[key] !== undefined) filters[key] = search[key]
  }
  return filters
}

export function activeFilterChips(search: SiteSearch) {
  return filterKeys.flatMap((key) => {
    if (search[key] === undefined) return []
    return [{ key, value: search[key] as string }]
  })
}

export const filterLabels: Record<FilterKey, string> = {
  path: "Page",
  referrer: "Referrer",
  country: "Country",
  city: "City",
  browser: "Browser",
  device: "Device",
  os: "OS",
  screen: "Screen",
  event: "Event",
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
  utm_content: "UTM content",
  utm_term: "UTM term",
}

export const metricLabels: Record<Metric, string> = {
  views: "Views",
  visitors: "Visitors",
  sessions: "Sessions",
  bounce: "Bounce rate",
  views_per_visit: "Views / visit",
}

export const rangeLabels: Record<RangePreset, string> = {
  "1d": "Today",
  "7d": "Week",
  "30d": "Month",
  custom: "Custom",
}

export const chartMetrics = ["views", "visitors", "sessions"] as const
export type ChartMetric = (typeof chartMetrics)[number]

export function isChartMetric(metric: Metric): metric is ChartMetric {
  return metric === "views" || metric === "visitors" || metric === "sessions"
}
