import { z } from "zod"

const hostnamePattern =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

export const breakdowns = [
  "path",
  "referrer",
  "country",
  "browser",
  "device",
  "event",
] as const

export const grains = ["hour", "day"] as const

export type Breakdown = (typeof breakdowns)[number]
export type Grain = (typeof grains)[number]

export const createSiteBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  domain: z
    .string()
    .trim()
    .max(253)
    .nullish()
    .transform((value) => {
      const host = value?.trim().toLowerCase().replace(/\.$/, "") ?? ""
      return host || null
    })
    .refine(
      (value) => value === null || hostnamePattern.test(value),
      "Invalid domain"
    ),
})

export const statsQuerySchema = z.object({
  start: z.string().trim().min(1),
  end: z.string().trim().min(1),
  grain: z.enum(grains).optional(),
  breakdown: z.enum(breakdowns).optional(),
})
