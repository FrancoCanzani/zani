import { zValidator } from "@hono/zod-validator"
import { eq, sql } from "drizzle-orm"
import { Hono } from "hono"

import { site, visitorIdentity } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { emailHash, linkCustomersToIdentity } from "../../../lib/revenue"
import { newId, sha256Hex } from "../../../lib/utils"
import type { AppEnv } from "../../../types"
import { countryFromRequest } from "../collect/lib/normalize"
import { originAllowed, originHost } from "../collect/lib/origin"

import { identifyBodySchema, normalizeTouch } from "./lib/touch"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function deviceFor(userAgent: string) {
  const value = userAgent.toLowerCase()
  if (/ipad|tablet/.test(value)) return "tablet"
  if (/mobi|iphone|android/.test(value)) return "mobile"
  return "desktop"
}

export const post = new Hono<AppEnv>().post(
  "/",
  zValidator("json", identifyBodySchema),
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
    const now = Date.now()
    const direct = normalizeTouch({}, matched.domain, now)!
    const first = normalizeTouch(body.firstTouch, matched.domain, now) ?? direct
    const last = normalizeTouch(body.lastTouch, matched.domain, now) ?? first
    const email = body.email && emailPattern.test(body.email) ? body.email : ""
    const hashed = email ? await emailHash(matched.id, email) : null

    const identity = {
      id: newId(),
      siteId: matched.id,
      userRef: body.userId,
      emailHash: hashed,
      signedUpAt: now,
      country: countryFromRequest(c.req.raw),
      device: deviceFor(c.req.header("user-agent") ?? ""),
      firstSource: first.source,
      firstMedium: first.medium,
      firstCampaign: first.campaign,
      firstReferrer: first.referrer,
      firstLanding: first.landing,
      firstSeenAt: first.seenAt,
      lastSource: last.source,
      lastMedium: last.medium,
      lastCampaign: last.campaign,
      lastReferrer: last.referrer,
      lastLanding: last.landing,
      lastSeenAt: last.seenAt,
    }

    // Attribution is frozen at signup: later identify calls (e.g. on login) only fill a missing email.
    const [stored] = await db
      .insert(visitorIdentity)
      .values(identity)
      .onConflictDoUpdate({
        target: [visitorIdentity.siteId, visitorIdentity.userRef],
        set: {
          emailHash: sql`coalesce(${visitorIdentity.emailHash}, ${hashed})`,
        },
      })
      .returning({
        id: visitorIdentity.id,
        userRef: visitorIdentity.userRef,
        emailHash: visitorIdentity.emailHash,
      })

    if (stored) {
      await linkCustomersToIdentity(db, matched.id, stored)
    }

    return c.body(null, 204)
  }
)
