import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { event, eventProp, site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, sha256Hex } from "../../../lib/utils"
import type { AppEnv } from "../../../types"
import { normalizeProps } from "../collect/lib/normalize"

import { serverEventBodySchema } from "./lib/schema"
import { lastContext, resolveVisitorId } from "./lib/visitor"

const maxFutureMs = 5 * 60 * 1000
const maxAgeMs = 7 * 24 * 60 * 60 * 1000

export const post = new Hono<AppEnv>().post(
  "/",
  zValidator("json", serverEventBodySchema),
  async (c) => {
    const header = c.req.header("authorization") ?? ""
    const secretKey = header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : ""
    if (!secretKey) {
      return c.json({ error: "unauthorized" as const }, 401)
    }

    const db = createDb(c.env)
    const [matched] = await db
      .select({ id: site.id, revokedAt: site.revokedAt })
      .from(site)
      .where(eq(site.secretKeyHash, await sha256Hex(secretKey)))
      .limit(1)
    if (!matched || matched.revokedAt !== null) {
      return c.json({ error: "unauthorized" as const }, 401)
    }

    const body = c.req.valid("json")
    const now = Date.now()
    const at = body.timestamp ?? now
    if (at > now + maxFutureMs || at < now - maxAgeMs) {
      return c.json(
        {
          error: "invalid_timestamp" as const,
          message: "timestamp must be within the last 7 days.",
        },
        400
      )
    }

    const visitorId = await resolveVisitorId(db, matched.id, body)
    const context = await lastContext(db, matched.id, visitorId, at)
    const eventId = newId()
    const props = normalizeProps(body.name, body.props)

    await db.insert(event).values({
      ...context.dims,
      id: eventId,
      siteId: matched.id,
      timestamp: at,
      name: body.name,
      visitorId,
      sessionId: context.sessionId ?? `srv_${newId()}`,
    })
    if (props.length > 0) {
      await db.insert(eventProp).values(
        props.map((prop) => ({
          id: newId(),
          eventId,
          siteId: matched.id,
          timestamp: at,
          key: prop.key,
          value: prop.value,
        }))
      )
    }

    return c.json({ id: eventId, visitorId }, 202)
  }
)
