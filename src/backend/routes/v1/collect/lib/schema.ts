import { z } from "zod"

const propValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

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
})

export type CollectBody = z.infer<typeof collectBodySchema>
