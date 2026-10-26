import { z } from "zod"

export const estimateLineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().trim().max(200),
  quantity: z.number().positive().max(100_000),
  unitAmountCents: z.number().int().min(0).max(100_000_000),
})

export const updateEstimateBodySchema = z.object({
  title: z.string().trim().max(120),
  customerId: z.string().min(1).nullable(),
  customerName: z.string().trim().max(120),
  customerPhone: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((value) => value?.trim() || null),
  customerEmail: z
    .string()
    .trim()
    .max(254)
    .nullish()
    .transform((value) => value?.trim() || null)
    .refine(
      (value) => value === null || z.email().safeParse(value).success,
      "Invalid email"
    ),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toLowerCase()),
  lineItems: z.array(estimateLineItemSchema).max(100),
  depositPercent: z.number().int().min(0).max(100),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => value?.trim() || null),
})
