import { z } from "zod"

import { statsQuerySchema } from "../../sites/lib/schema"

export const activityTypes = ["all", "pageviews", "signups", "revenue"] as const

export type ActivityType = (typeof activityTypes)[number]

export const activityQuerySchema = statsQuerySchema
  .omit({ breakdown: true, grain: true })
  .extend({
    type: z.enum(activityTypes).default("all"),
    before: z.coerce.number().int().positive().optional(),
  })

export type ActivityQuery = z.infer<typeof activityQuerySchema>
