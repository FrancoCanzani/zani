import { zValidator } from "@hono/zod-validator"
import { and, eq, like } from "drizzle-orm"
import { Hono } from "hono"

import {
  event,
  eventProp,
  mrrSnapshot,
  revenueMovement,
  site,
  stripeCustomer,
  visitorIdentity,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import {
  chunk,
  recomputeCustomer,
  rowsPerInsert,
  runBatch,
} from "../../../lib/revenue"
import { newId, nowMs, randomToken, sha256Hex } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadSite } from "./lib/load"
import { createSiteBodySchema } from "./lib/schema"
import { serializeSite } from "./lib/serialize"
import {
  buildSimulation,
  simCustomerPrefix,
  simUserPrefix,
  simVisitorPrefix,
} from "./lib/simulate"

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

      const simulation = buildSimulation(matched.id)
      const simCustomer = `${simCustomerPrefix}%`
      const statements = [
        db
          .delete(event)
          .where(
            and(
              eq(event.siteId, matched.id),
              like(event.visitorId, `${simVisitorPrefix}%`)
            )
          ),
        db
          .delete(revenueMovement)
          .where(
            and(
              eq(revenueMovement.siteId, matched.id),
              like(revenueMovement.customerId, simCustomer)
            )
          ),
        db
          .delete(mrrSnapshot)
          .where(
            and(
              eq(mrrSnapshot.siteId, matched.id),
              like(mrrSnapshot.customerId, simCustomer)
            )
          ),
        db
          .delete(stripeCustomer)
          .where(
            and(
              eq(stripeCustomer.siteId, matched.id),
              like(stripeCustomer.id, simCustomer)
            )
          ),
        db
          .delete(visitorIdentity)
          .where(
            and(
              eq(visitorIdentity.siteId, matched.id),
              like(visitorIdentity.userRef, `${simUserPrefix}%`)
            )
          ),
        ...chunk(simulation.events, rowsPerInsert(20)).map((part) =>
          db.insert(event).values(part)
        ),
        ...chunk(simulation.props, rowsPerInsert(6)).map((part) =>
          db.insert(eventProp).values(part)
        ),
        ...chunk(simulation.identities, rowsPerInsert(20)).map((part) =>
          db.insert(visitorIdentity).values(part)
        ),
        ...chunk(simulation.customers, rowsPerInsert(13)).map((part) =>
          db.insert(stripeCustomer).values(part)
        ),
        ...chunk(simulation.snapshots, rowsPerInsert(7)).map((part) =>
          db.insert(mrrSnapshot).values(part)
        ),
      ]
      for (const part of chunk(statements, 50)) {
        await runBatch(db, part)
      }
      for (const customer of simulation.customers) {
        await recomputeCustomer(db, matched.id, customer.id)
      }

      return c.json(
        {
          inserted: simulation.events.length,
          signups: simulation.identities.length,
          customers: simulation.customers.length,
        },
        200
      )
    }
  )
