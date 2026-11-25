import { z } from "zod"

const propValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

const anonymousIdSchema = z
  .string()
  .trim()
  .uuid()

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
  anonymousId: anonymousIdSchema.optional(),
  userId: z.string().trim().min(1).max(128).optional(),
  email: z.string().trim().email().max(254).optional(),
  firstPath: z.string().trim().min(1).max(2048).optional(),
  firstReferrer: z.string().trim().max(2048).optional(),
  firstUtmSource: z.string().trim().max(80).optional(),
  firstUtmMedium: z.string().trim().max(80).optional(),
  firstUtmCampaign: z.string().trim().max(80).optional(),
  firstUtmContent: z.string().trim().max(80).optional(),
  firstUtmTerm: z.string().trim().max(80).optional(),
})

export type CollectBody = z.infer<typeof collectBodySchema>
