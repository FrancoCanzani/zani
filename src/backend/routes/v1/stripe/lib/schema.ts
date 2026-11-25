import { z } from "zod"

const apiKey = z
  .string()
  .trim()
  .regex(/^(rk|sk)_(live|test)_[A-Za-z0-9]{10,}$/, "Invalid Stripe key")

const webhookSecret = z
  .string()
  .trim()
  .regex(/^whsec_[A-Za-z0-9+/=]{10,}$/, "Invalid webhook secret")

export const connectBodySchema = z.object({
  apiKey,
  webhookSecret: webhookSecret.optional(),
})

export const updateConnectionBodySchema = z.object({
  webhookSecret: webhookSecret.nullable(),
})
