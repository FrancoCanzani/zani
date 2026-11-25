import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { event, eventProp, site, vital } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, sha256Hex } from "../../../lib/utils"
import type { AppEnv } from "../../../types"

import { botBrowser, isBot } from "./lib/bot"
import { clientIp, privacyIds } from "./lib/identity"
import {
  cityFromRequest,
  countryFromRequest,
  normalizeEvent,
  normalizePath,
  normalizeProps,
  type NormalizedEvent,
} from "./lib/normalize"
import { originAllowed, originHost } from "./lib/origin"
import { collectBodySchema } from "./lib/schema"
import { normalizeVitals } from "./lib/vitals"

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

    const body = c.req.valid("json")
    const vitals = normalizeVitals(body.vitals)
    const insertEvent =
      body.name !== undefined || body.vitals === undefined || vitals.length === 0

    if (!insertEvent && vitals.length === 0) {
      return c.json({ error: "invalid_event" as const }, 400)
    }

    const userAgent = c.req.header("user-agent") ?? ""
    const now = Date.now()
    const ids = await privacyIds({
      secret: c.env.BETTER_AUTH_SECRET,
      siteId: matched.id,
      ip: clientIp(c.req.raw),
      userAgent,
      now,
    })
    const geo = {
      country: countryFromRequest(c.req.raw),
      city: cityFromRequest(c.req.raw),
    }

    let dims: NormalizedEvent | null = null
    if (insertEvent) {
      dims = normalizeEvent(body, {
        siteDomain: matched.domain,
        userAgent,
        ...geo,
      })
      if (!dims) {
        return c.json({ error: "invalid_event" as const }, 400)
      }

      const eventId = newId()
      const props = normalizeProps(dims.name, body.props)
      const browser = isBot(userAgent) ? botBrowser : dims.browser

      await db.insert(event).values({
        id: eventId,
        siteId: matched.id,
        timestamp: now,
        ...dims,
        ...ids,
        browser,
      })

      if (props.length > 0) {
        await db.insert(eventProp).values(
          props.map((prop) => ({
            id: newId(),
            eventId,
            siteId: matched.id,
            timestamp: now,
            key: prop.key,
            value: prop.value,
          }))
        )
      }
    }

    if (vitals.length > 0) {
      const path = dims?.path ?? normalizePath(body.path)
      if (!path) {
        return c.json({ error: "invalid_event" as const }, 400)
      }

      if (!dims) {
        dims = normalizeEvent(
          { ...body, name: "pageview" },
          {
            siteDomain: matched.domain,
            userAgent,
            ...geo,
          }
        )
        if (!dims) {
          return c.json({ error: "invalid_event" as const }, 400)
        }
      }

      const browser = isBot(userAgent) ? botBrowser : dims.browser
      await db.insert(vital).values(
        vitals.map((sample) => ({
          id: newId(),
          siteId: matched.id,
          timestamp: now,
          metric: sample.metric,
          value: sample.value,
          rating: sample.rating,
          path,
          element: sample.element,
          navType: sample.navType,
          visitorId: ids.visitorId,
          sessionId: ids.sessionId,
          country: dims!.country,
          city: dims!.city,
          browser,
          device: dims!.device,
          os: dims!.os,
        }))
      )
    }

    return c.body(null, 204)
  }
)
