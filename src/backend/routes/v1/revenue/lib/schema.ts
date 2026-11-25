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

export const overviewQuerySchema = z.object({
  range: z.enum(revenueRanges).default("90d"),
})

export const attributionQuerySchema = z.object({
  range: z.enum(revenueRanges).default("90d"),
  by: z.enum(attributionDimensions).default("source"),
  touch: z.enum(touches).default("first"),
})
