import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { customer } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { createCustomerBodySchema } from "./lib/schema"
import { serializeCustomer } from "./lib/serialize"

export const createCustomer = new Hono<AppEnv>().post(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", createCustomerBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const now = nowMs()

    const created = {
      id: newId(),
      workspaceId: current.workspace.id,
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(customer).values(created)

    return c.json({ customer: serializeCustomer(created) }, 201)
  }
)
