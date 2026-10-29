import { z } from "zod"

export const invoiceLineItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1).nullable(),
  name: z.string().trim().max(200),
  description: z.string().trim().max(500),
  quantity: z.number().positive().max(100_000),
  unitAmountCents: z.number().int().min(0).max(100_000_000),
})

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value?.trim() || null)

export const updateInvoiceBodySchema = z.object({
  customerId: z.string().min(1).nullable(),
  customerName: z.string().trim().max(120),
  customerPhone: nullableTrimmed(40),
  customerEmail: nullableTrimmed(254).refine(
    (value) => value === null || z.email().safeParse(value).success,
    "Invalid email"
  ),
  customerAddress: nullableTrimmed(500),
  customerTaxId: nullableTrimmed(80),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toLowerCase()),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .nullish()
    .transform((value) => value || null),
  paymentTerms: nullableTrimmed(500),
  notes: nullableTrimmed(2000),
  taxName: nullableTrimmed(80),
  taxRateBps: z.number().int().min(0).max(10_000),
  taxInclusive: z.boolean(),
  lineItems: z.array(invoiceLineItemSchema).max(100),
})
