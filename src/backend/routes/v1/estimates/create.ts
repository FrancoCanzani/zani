import { Hono } from "hono"

import { estimate } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeEstimate } from "./lib/serialize"

export const createEstimate = new Hono<AppEnv>().post(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const now = nowMs()
    const id = newId()
    const lineId = newId()

    const created = {
      id,
      workspaceId: current.workspace.id,
      publicSlug: newId(),
      status: "draft" as const,
      title: "",
      customerId: null,
      customerName: "",
      customerPhone: null,
      customerEmail: null,
      currency: "usd",
      lineItems: [
        {
          id: lineId,
          description: "",
          quantity: 1,
          unitAmountCents: 0,
        },
      ],
      depositPercent: 30,
      notes: null,
      createdByUserId: c.var.user.id,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(estimate).values(created)

    return c.json({ estimate: serializeEstimate(created) }, 201)
  }
)
