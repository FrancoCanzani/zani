import { z } from "zod"

import { breakdowns, statsQuerySchema } from "../../sites/lib/schema"

export const attributionDimensions = [
  "source",
  "medium",
  "campaign",
  "landing",
] as const
export const touches = ["first", "last"] as const

export type AttributionDimension = (typeof attributionDimensions)[number]
export type Touch = (typeof touches)[number]

export const revenueQuerySchema = statsQuerySchema.omit({ breakdown: true })

export type RevenueQuery = z.infer<typeof revenueQuerySchema>

export const revenueBreakdownQuerySchema = revenueQuerySchema.extend({
  by: z.enum(breakdowns),
})

export const attributionQuerySchema = revenueQuerySchema.extend({
  by: z.enum(attributionDimensions).default("source"),
  touch: z.enum(touches).default("first"),
})
