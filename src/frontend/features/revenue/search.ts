import { z } from "zod"

export const revenueRanges = ["30d", "90d", "12m", "all"] as const
export const attributionDimensions = [
  "source",
  "medium",
  "campaign",
  "landing",
] as const
export const touches = ["first", "last"] as const

export type RevenueRange = (typeof revenueRanges)[number]
export type AttributionDimension = (typeof attributionDimensions)[number]
export type Touch = (typeof touches)[number]

export const revenueSearchSchema = z.object({
  range: z.enum(revenueRanges).default("90d"),
  by: z.enum(attributionDimensions).default("source"),
  touch: z.enum(touches).default("first"),
})

export type RevenueSearch = z.infer<typeof revenueSearchSchema>

export const revenueRangeLabels: Record<RevenueRange, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
  all: "All time",
}

export const dimensionLabels: Record<AttributionDimension, string> = {
  source: "Source",
  medium: "Medium",
  campaign: "Campaign",
  landing: "Landing page",
}

export const touchLabels: Record<Touch, string> = {
  first: "First touch",
  last: "Last touch",
}
