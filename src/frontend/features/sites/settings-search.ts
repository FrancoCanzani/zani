import { z } from "zod"

export const siteSettingsSearchSchema = z.object({
  stripe: z.enum(["connected", "denied", "error"]).optional(),
})
