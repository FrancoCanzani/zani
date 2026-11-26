import { and, desc, eq } from "drizzle-orm"

import { event, visitor } from "../../../../db/schema"
import type { Database } from "../../../../lib/db"
import { sha256Hex } from "../../../../lib/utils"

const sessionMs = 30 * 60 * 1000

export async function resolveVisitorId(
  db: Database,
  siteId: string,
  input: { userId?: string; anonymousId?: string }
) {
  if (input.anonymousId) return input.anonymousId
  const userId = input.userId ?? ""
  const [known] = await db
    .select({ anonymousId: visitor.anonymousId })
    .from(visitor)
    .where(and(eq(visitor.siteId, siteId), eq(visitor.userId, userId)))
    .orderBy(desc(visitor.lastSeenAt))
    .limit(1)
  if (known) return known.anonymousId
  return `usr_${(await sha256Hex(`${siteId}\0${userId}`)).slice(0, 32)}`
}

// Server events have no browser context, so they inherit the visitor's last known page, source, and device.
export async function lastContext(
  db: Database,
  siteId: string,
  visitorId: string,
  at: number
) {
  const [last] = await db
    .select({
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      path: event.path,
      referrerHost: event.referrerHost,
      referrerPath: event.referrerPath,
      country: event.country,
      city: event.city,
      browser: event.browser,
      device: event.device,
      os: event.os,
      screen: event.screen,
      utmSource: event.utmSource,
      utmMedium: event.utmMedium,
      utmCampaign: event.utmCampaign,
      utmContent: event.utmContent,
      utmTerm: event.utmTerm,
    })
    .from(event)
    .where(and(eq(event.siteId, siteId), eq(event.visitorId, visitorId)))
    .orderBy(desc(event.timestamp))
    .limit(1)
  if (!last) return { sessionId: null, dims: { path: "/" } }
  const { timestamp, sessionId, ...dims } = last
  return {
    sessionId: Math.abs(at - timestamp) <= sessionMs ? sessionId : null,
    dims,
  }
}
