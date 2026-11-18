import { z } from "zod"

export const rangePresets = ["1d", "7d", "30d"] as const
export const metrics = ["views", "visitors", "sessions"] as const
export const filterKeys = [
  "path",
  "referrer",
  "country",
  "browser",
  "device",
  "utm_source",
  "utm_medium",
  "utm_campaign",
] as const

export type RangePreset = (typeof rangePresets)[number]
export type Metric = (typeof metrics)[number]
export type FilterKey = (typeof filterKeys)[number]

export const siteSearchSchema = z.object({
  range: z.enum(rangePresets).default("7d"),
  metric: z.enum(metrics).default("views"),
  path: z.string().optional(),
  referrer: z.string().optional(),
  country: z.string().optional(),
  browser: z.string().optional(),
  device: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
})

export type SiteSearch = z.infer<typeof siteSearchSchema>

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

export function rangeFromPreset(preset: RangePreset): {
  start: string
  end: string
  grain: "hour" | "day"
} {
  const endMs = Math.ceil(Date.now() / hourMs) * hourMs
  const days = preset === "1d" ? 1 : preset === "7d" ? 7 : 30
  return {
    start: new Date(endMs - days * dayMs).toISOString(),
    end: new Date(endMs).toISOString(),
    grain: days <= 1 ? "hour" : "day",
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
  browser: "Browser",
  device: "Device",
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
}

export const metricLabels: Record<Metric, string> = {
  views: "Views",
  visitors: "Visitors",
  sessions: "Sessions",
}

export const rangeLabels: Record<RangePreset, string> = {
  "1d": "Today",
  "7d": "7d",
  "30d": "30d",
}
