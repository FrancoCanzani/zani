import { z } from "zod"

const hostnamePattern =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/

export const breakdowns = [
  "path",
  "referrer",
  "country",
  "browser",
  "device",
  "event",
  "utm_source",
  "utm_medium",
  "utm_campaign",
] as const

export const grains = ["hour", "day"] as const

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

export type Breakdown = (typeof breakdowns)[number]
export type Grain = (typeof grains)[number]
export type FilterKey = (typeof filterKeys)[number]

export const createSiteBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  domain: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .transform((value) => value.toLowerCase().replace(/\.$/, ""))
    .refine((value) => hostnamePattern.test(value), "Invalid domain"),
})

const filterValue = z.string().max(2048)

export const statsQuerySchema = z.object({
  start: z.string().trim().min(1),
  end: z.string().trim().min(1),
  grain: z.enum(grains).optional(),
  breakdown: z.enum(breakdowns).optional(),
  path: filterValue.optional(),
  referrer: filterValue.optional(),
  country: filterValue.optional(),
  browser: filterValue.optional(),
  device: filterValue.optional(),
  utm_source: filterValue.optional(),
  utm_medium: filterValue.optional(),
  utm_campaign: filterValue.optional(),
})
