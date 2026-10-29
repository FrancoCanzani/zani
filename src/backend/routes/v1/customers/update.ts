import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { customer } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { updateCustomerBodySchema } from "./lib/schema"
import { serializeCustomer } from "./lib/serialize"

export const updateCustomer = new Hono<AppEnv>().patch(
  "/:customerId",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateCustomerBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const customerId = c.req.param("customerId")

    const [existing] = await db
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.id, customerId),
          eq(customer.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!existing) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const now = nowMs()
    await db
      .update(customer)
      .set({
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        taxId: body.taxId ?? null,
        notes: body.notes ?? null,
        updatedAt: now,
      })
      .where(eq(customer.id, customerId))

    const [row] = await db
      .select()
      .from(customer)
      .where(eq(customer.id, customerId))
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ customer: serializeCustomer(row) }, 200)
  }
)
