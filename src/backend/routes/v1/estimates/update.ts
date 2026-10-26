import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { estimate } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { resolveEstimateCustomer } from "./lib/customers"
import { updateEstimateBodySchema } from "./lib/schema"
import { serializeEstimate } from "./lib/serialize"

export const updateEstimate = new Hono<AppEnv>().patch(
  "/:estimateId",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateEstimateBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const estimateId = c.req.param("estimateId")

    const [existing] = await db
      .select({ id: estimate.id, status: estimate.status })
      .from(estimate)
      .where(
        and(
          eq(estimate.id, estimateId),
          eq(estimate.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!existing) {
      return c.json({ error: "not_found" as const }, 404)
    }

    if (existing.status === "accepted" || existing.status === "cancelled") {
      return c.json({ error: "immutable" as const }, 409)
    }

    const resolved = await resolveEstimateCustomer(c.env, current.workspace.id, {
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone ?? null,
      customerEmail: body.customerEmail ?? null,
    })

    if ("error" in resolved) {
      return c.json({ error: resolved.error }, 404)
    }

    const now = nowMs()
    await db
      .update(estimate)
      .set({
        title: body.title,
        customerId: resolved.customerId,
        customerName: resolved.customerName,
        customerPhone: resolved.customerPhone,
        customerEmail: resolved.customerEmail,
        currency: body.currency,
        lineItems: body.lineItems,
        depositPercent: body.depositPercent,
        notes: body.notes ?? null,
        updatedAt: now,
      })
      .where(eq(estimate.id, estimateId))

    const [row] = await db
      .select()
      .from(estimate)
      .where(eq(estimate.id, estimateId))
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ estimate: serializeEstimate(row) }, 200)
  }
)
