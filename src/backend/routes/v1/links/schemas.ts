import { z } from "zod"

export const createLinkBodySchema = z.object({
  destinationUrl: z.url().refine((value) => {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  }, "Enter an http(s) URL"),
  name: z.string().trim().max(80).optional(),
})
