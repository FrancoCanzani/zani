import { z } from "zod"

export const connectStripeBodySchema = z.object({
  secretKey: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .refine(
      (value) => value.startsWith("sk_") || value.startsWith("rk_"),
      "Use a Stripe secret or restricted key."
    ),
  webhookSecret: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .refine(
      (value) => value.startsWith("whsec_"),
      "Use a Stripe webhook signing secret."
    ),
})
