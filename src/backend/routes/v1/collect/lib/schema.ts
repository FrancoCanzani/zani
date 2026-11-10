import { z } from "zod"

export const collectBodySchema = z.object({
  name: z.string().trim().max(32).optional(),
  sessionId: z.string().trim().min(1).max(64),
  path: z.string().trim().min(1).max(2048),
  referrer: z.string().trim().max(2048).optional(),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(80).optional(),
})

export type CollectBody = z.infer<typeof collectBodySchema>
