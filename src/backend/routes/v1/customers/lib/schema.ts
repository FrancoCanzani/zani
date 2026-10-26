import { z } from "zod"

export const createCustomerBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((value) => value?.trim() || null),
  email: z
    .string()
    .trim()
    .max(254)
    .nullish()
    .transform((value) => value?.trim() || null)
    .refine(
      (value) => value === null || z.email().safeParse(value).success,
      "Invalid email"
    ),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => value?.trim() || null),
})

export const updateCustomerBodySchema = createCustomerBodySchema

export const listCustomersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
})
