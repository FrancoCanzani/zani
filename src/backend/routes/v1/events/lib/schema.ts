import { z } from "zod"

const reservedNames = ["pageview", "identify"]

export const serverEventBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{1,32}$/)
      .refine((value) => !reservedNames.includes(value), "Reserved name"),
    userId: z.string().trim().min(1).max(128).optional(),
    anonymousId: z.string().trim().uuid().optional(),
    props: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()])
      )
      .optional(),
    timestamp: z.number().int().positive().optional(),
  })
  .refine(
    (value) => value.userId !== undefined || value.anonymousId !== undefined,
    "Send userId or anonymousId"
  )

export type ServerEventBody = z.infer<typeof serverEventBodySchema>
