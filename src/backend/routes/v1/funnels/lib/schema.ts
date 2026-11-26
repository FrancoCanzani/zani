import { z } from "zod"

import { statsQuerySchema } from "../../sites/lib/schema"

export const maxFunnelSteps = 8

export const funnelStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("page"),
    path: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .refine((value) => value.startsWith("/"), "Paths start with /"),
  }),
  z.object({
    type: z.literal("event"),
    name: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{1,32}$/),
  }),
  z.object({ type: z.literal("signup") }),
  z.object({ type: z.literal("paid") }),
])

export type FunnelStep = z.infer<typeof funnelStepSchema>

export const funnelBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  steps: z.array(funnelStepSchema).min(2).max(maxFunnelSteps),
})

export const funnelResultsQuerySchema = statsQuerySchema.omit({
  breakdown: true,
  goal: true,
})

export type FunnelResultsQuery = z.infer<typeof funnelResultsQuerySchema>

export function parseSteps(raw: string): FunnelStep[] {
  try {
    const parsed = z.array(funnelStepSchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}
