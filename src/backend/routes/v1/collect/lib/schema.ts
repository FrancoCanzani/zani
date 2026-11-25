import { z } from "zod"

const propValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

const vitalSampleSchema = z.object({
  metric: z.enum(["load", "lcp", "inp", "cls"]),
  value: z.number(),
  element: z.string().trim().max(200).optional(),
  navType: z
    .enum(["navigate", "reload", "back_forward", "prerender"])
    .optional(),
})

export const collectBodySchema = z.object({
  name: z.string().trim().max(32).optional(),
  path: z.string().trim().min(1).max(2048),
  referrer: z.string().trim().max(2048).optional(),
  screen: z.string().trim().max(32).optional(),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(80).optional(),
  utmContent: z.string().trim().max(80).optional(),
  utmTerm: z.string().trim().max(80).optional(),
  props: z.record(z.string(), propValueSchema).optional(),
  vitals: z.array(vitalSampleSchema).max(8).optional(),
})

export type CollectBody = z.infer<typeof collectBodySchema>
