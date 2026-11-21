import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { event, site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import {
  newId,
  nowMs,
  randomToken,
  sha256Hex,
} from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadSite } from "./lib/load"
import { createSiteBodySchema } from "./lib/schema"
import { serializeSite } from "./lib/serialize"
import { batchSize, buildSimulateRows } from "./lib/simulate"

export const post = new Hono<AppEnv>()
  .post(
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
  .post(
    "/:siteId/revoke",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const db = createDb(c.env)
      const existing = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId")
      )
      if (!existing) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const revokedAt = existing.revokedAt ?? nowMs()
      if (existing.revokedAt === null) {
        await db.update(site).set({ revokedAt }).where(eq(site.id, existing.id))
      }

      return c.json(
        {
          site: serializeSite({ ...existing, revokedAt }),
        },
        200
      )
    }
  )
  .post(
    "/:siteId/write-key",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const db = createDb(c.env)
      const existing = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId")
      )
      if (!existing) {
        return c.json({ error: "not_found" as const }, 404)
      }
      if (existing.revokedAt !== null) {
        return c.json({ error: "revoked" as const }, 409)
      }

      const writeKey = randomToken()
      const writeKeyHash = await sha256Hex(writeKey)
      await db
        .update(site)
        .set({ writeKeyHash })
        .where(eq(site.id, existing.id))

      return c.json(
        {
          site: serializeSite(existing),
          writeKey,
        },
        200
      )
    }
  )
  .post(
    "/:siteId/simulate",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      if (c.env.ENVIRONMENT !== "development") {
        return c.json({ error: "not_found" as const }, 404)
      }

      const current = workspaceFromContext(c.var)
      const db = createDb(c.env)
      const matched = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId")
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }
      if (matched.revokedAt !== null) {
        return c.json({ error: "revoked" as const }, 409)
      }

      const rows = buildSimulateRows(matched.id)
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        await db.insert(event).values(rows.slice(offset, offset + batchSize))
      }

      return c.json({ inserted: rows.length }, 200)
    }
  )
