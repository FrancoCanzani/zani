import { z } from "zod"

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value?.trim() || null),
  unitAmountCents: z.number().int().min(0).max(100_000_000),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toLowerCase())
    .optional(),
})

export const updateProductBodySchema = createProductBodySchema

export const listProductsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
})
