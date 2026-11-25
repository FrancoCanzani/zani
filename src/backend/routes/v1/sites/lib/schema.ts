import { z } from "zod"

const hostnamePattern =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/

const domainSchema = z
  .string()
  .trim()
  .min(1)
  .max(253)
  .transform((value) => value.toLowerCase().replace(/\.$/, ""))
  .refine((value) => hostnamePattern.test(value), "Invalid domain")

export const breakdowns = [
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
  "prop_key",
  "prop_value",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "entry",
  "exit",
] as const

export const grains = ["hour", "day"] as const

export const filterKeys = [
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

export type Breakdown = (typeof breakdowns)[number]
export type Grain = (typeof grains)[number]
export type FilterKey = (typeof filterKeys)[number]

export const createSiteBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  domain: domainSchema,
})

export const updateSiteBodySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    domain: domainSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.domain !== undefined)

const filterValue = z.string().max(2048)

export const statsQuerySchema = z.object({
  start: z.string().trim().min(1),
  end: z.string().trim().min(1),
  grain: z.enum(grains).optional(),
  breakdown: z.enum(breakdowns).optional(),
  tz: z.string().trim().min(1).max(64).optional(),
  bots: z.enum(["0", "1"]).optional(),
  path: filterValue.optional(),
  referrer: filterValue.optional(),
  referrer_path: filterValue.optional(),
  country: filterValue.optional(),
  city: filterValue.optional(),
  browser: filterValue.optional(),
  device: filterValue.optional(),
  os: filterValue.optional(),
  screen: filterValue.optional(),
  event: filterValue.optional(),
  prop: filterValue.optional(),
  prop_value: filterValue.optional(),
  utm_source: filterValue.optional(),
  utm_medium: filterValue.optional(),
  utm_campaign: filterValue.optional(),
  utm_content: filterValue.optional(),
  utm_term: filterValue.optional(),
})
