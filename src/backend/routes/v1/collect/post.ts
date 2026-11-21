import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { event, site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, sha256Hex } from "../../../lib/utils"
import type { AppEnv } from "../../../types"

import { botBrowser, isBot } from "./lib/bot"
import { clientIp, privacyIds } from "./lib/identity"
import {
  cityFromRequest,
  countryFromRequest,
  normalizeEvent,
} from "./lib/normalize"
import { originAllowed, originHost } from "./lib/origin"
import { collectBodySchema } from "./lib/schema"

export const post = new Hono<AppEnv>().post(
  "/",
  zValidator("json", collectBodySchema),
  async (c) => {
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

    if (!originAllowed(originHost(c.req.header("origin")), matched.domain)) {
      return c.json({ error: "origin" as const }, 403)
    }

    const userAgent = c.req.header("user-agent") ?? ""
    const normalized = normalizeEvent(c.req.valid("json"), {
      siteDomain: matched.domain,
      userAgent,
      country: countryFromRequest(c.req.raw),
      city: cityFromRequest(c.req.raw),
    })
    if (!normalized) {
      return c.json({ error: "invalid_event" as const }, 400)
    }

    const now = Date.now()
    const ids = await privacyIds({
      secret: c.env.BETTER_AUTH_SECRET,
      siteId: matched.id,
      ip: clientIp(c.req.raw),
      userAgent,
      now,
    })

    await db.insert(event).values({
      id: newId(),
      siteId: matched.id,
      timestamp: now,
      ...normalized,
      ...ids,
      browser: isBot(userAgent) ? botBrowser : normalized.browser,
    })

    return c.body(null, 204)
  }
)
