import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { cors } from "hono/cors"

import { event, site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, sha256Hex } from "../../../lib/utils"
import type { AppEnv } from "../../../types"

import { countryFromRequest, normalizeEvent } from "./lib/normalize"
import { collectBodySchema } from "./lib/schema"

export const collect = new Hono<AppEnv>()
  .use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["POST"],
      allowHeaders: ["content-type", "x-write-key"],
    })
  )
  .post("/", zValidator("json", collectBodySchema), async (c) => {
    const writeKey = c.req.header("x-write-key")?.trim()
    if (!writeKey) {
      return c.json({ error: "unauthorized" as const }, 401)
    }

    const db = createDb(c.env)
    const [matched] = await db
      .select()
      .from(site)
      .where(eq(site.writeKeyHash, await sha256Hex(writeKey)))
      .limit(1)

    if (!matched || matched.revokedAt !== null) {
      return c.json({ error: "unauthorized" as const }, 401)
    }

    const normalized = normalizeEvent(c.req.valid("json"), {
      siteDomain: matched.domain,
      userAgent: c.req.header("user-agent") ?? "",
      country: countryFromRequest(c.req.raw),
    })
    if (!normalized) {
      return c.json({ error: "invalid_event" as const }, 400)
    }

    await db.insert(event).values({
      id: newId(),
      siteId: matched.id,
      timestamp: Date.now(),
      ...normalized,
    })

    return c.body(null, 204)
  })
