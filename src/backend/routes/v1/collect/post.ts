import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { event, eventProp, site } from "../../../db/schema"
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
} from "./lib/normalize"
import { originAllowed, originHost } from "./lib/origin"
import { collectBodySchema } from "./lib/schema"
import { upsertVisitor, type FirstTouch } from "./lib/visitor"

function firstTouchFromBody(
  body: {
    firstPath?: string
    firstReferrer?: string
    firstUtmSource?: string
    firstUtmMedium?: string
    firstUtmCampaign?: string
    firstUtmContent?: string
    firstUtmTerm?: string
    path: string
    referrer?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmContent?: string
    utmTerm?: string
  },
  siteDomain: string
): FirstTouch {
  const path = normalizePath(body.firstPath ?? body.path) ?? ""
  const referrerRaw = body.firstReferrer ?? body.referrer
  let firstReferrerHost = ""
  let firstReferrerPath = ""
  if (referrerRaw?.trim()) {
    try {
      const url = new URL(referrerRaw.trim())
      const host = url.hostname.toLowerCase().replace(/\.$/, "")
      if (host && host !== siteDomain.toLowerCase()) {
        firstReferrerHost = host
        let referrerPath = url.pathname || "/"
        if (!referrerPath.startsWith("/")) referrerPath = `/${referrerPath}`
        if (referrerPath.length > 1024) referrerPath = referrerPath.slice(0, 1024)
        firstReferrerPath = referrerPath
      }
    } catch {
      // ignore malformed first referrer
    }
  }
  const utm = (value: string | undefined) => {
    if (!value) return ""
    const trimmed = value.trim().slice(0, 80)
    for (const char of trimmed) {
      if (char.charCodeAt(0) < 32) return ""
    }
    return trimmed
  }
  return {
    firstPath: path,
    firstReferrerHost,
    firstReferrerPath,
    firstUtmSource: utm(body.firstUtmSource ?? body.utmSource),
    firstUtmMedium: utm(body.firstUtmMedium ?? body.utmMedium),
    firstUtmCampaign: utm(body.firstUtmCampaign ?? body.utmCampaign),
    firstUtmContent: utm(body.firstUtmContent ?? body.utmContent),
    firstUtmTerm: utm(body.firstUtmTerm ?? body.utmTerm),
  }
}

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
    const userAgent = c.req.header("user-agent") ?? ""
    const now = Date.now()
    const ids = await privacyIds({
      secret: c.env.BETTER_AUTH_SECRET,
      siteId: matched.id,
      ip: clientIp(c.req.raw),
      userAgent,
      now,
    })
    const visitorId = body.anonymousId ?? ids.visitorId
    const sessionId = ids.sessionId

    if (body.anonymousId) {
      await upsertVisitor(db, {
        siteId: matched.id,
        anonymousId: body.anonymousId,
        now,
        firstTouch: firstTouchFromBody(body, matched.domain),
        userId: body.userId,
        email: body.email,
      })
    }

    const dims = normalizeEvent(body, {
      siteDomain: matched.domain,
      userAgent,
      country: countryFromRequest(c.req.raw),
      city: cityFromRequest(c.req.raw),
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
      visitorId,
      sessionId,
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

    return c.body(null, 204)
  }
)
