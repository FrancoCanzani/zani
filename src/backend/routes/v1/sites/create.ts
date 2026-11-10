import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs, randomToken, sha256Hex } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { createSiteBodySchema } from "./lib/schema"
import { serializeSite } from "./lib/serialize"

export const createSite = new Hono<AppEnv>().post(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", createSiteBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }

    const body = c.req.valid("json")
    const db = createDb(c.env)
    const writeKey = randomToken()
    const created = {
      id: newId(),
      workspaceId: current.workspace.id,
      name: body.name,
      domain: body.domain,
      writeKeyHash: await sha256Hex(writeKey),
      createdAt: nowMs(),
      revokedAt: null,
    }

    await db.insert(site).values(created)

    return c.json(
      {
        site: serializeSite(created),
        writeKey,
      },
      201
    )
  }
)
