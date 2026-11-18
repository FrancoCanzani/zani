import { Hono } from "hono"

import { event } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { loadSite } from "./lib/load"

const dayMs = 24 * 60 * 60 * 1000
// D1 caps bound parameters per query (~100); each event row binds 19 columns.
const batchSize = 5
const eventCount = 240

const paths = ["/", "/pricing", "/docs", "/blog", "/about", "/changelog"]
const countries = ["US", "GB", "DE", "BR", "JP", "FR", "CA", ""]
const cities = [
  "San Francisco",
  "London",
  "Berlin",
  "Sao Paulo",
  "Tokyo",
  "Paris",
  "Toronto",
  "",
]
const browsers = ["chrome", "safari", "firefox", "edge", "other"]
const devices = ["desktop", "mobile", "tablet"]
const operatingSystems = ["macos", "windows", "ios", "android", "linux", "other"]
const screens = ["1440x900", "1920x1080", "390x844", "1366x768", "2560x1440"]
const referrers = [
  "",
  "google.com",
  "t.co",
  "github.com",
  "news.ycombinator.com",
  "bing.com",
]
const utms = [
  {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  },
  {
    utmSource: "twitter",
    utmMedium: "social",
    utmCampaign: "launch",
    utmContent: "hero",
    utmTerm: "",
  },
  {
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "weekly",
    utmContent: "header",
    utmTerm: "",
  },
  {
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "brand",
    utmContent: "ad1",
    utmTerm: "analytics",
  },
]

function pick<T>(values: T[], index: number): T {
  return values[index % values.length]!
}

function visitorToken(index: number) {
  return `sim_vis_${(index % 48).toString(16).padStart(8, "0")}_abcdef`
}

function sessionToken(visitor: number, day: number) {
  return `sim_ses_${visitor.toString(16).padStart(4, "0")}_${day.toString(16).padStart(4, "0")}_xx`
}

export const simulateSite = new Hono<AppEnv>().post(
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

    const end = Date.now()
    const start = end - 7 * dayMs
    const rows = Array.from({ length: eventCount }, (_, index) => {
      const visitor = index % 48
      const day = Math.floor((index / eventCount) * 7)
      const utm = pick(utms, index)
      return {
        id: newId(),
        siteId: matched.id,
        timestamp: start + Math.floor(((index + 1) / (eventCount + 1)) * (end - start)),
        name: "pageview" as const,
        visitorId: visitorToken(visitor),
        sessionId: sessionToken(visitor, day),
        path: pick(paths, index + visitor),
        referrerHost: pick(referrers, index + day),
        country: pick(countries, index),
        city: pick(cities, index),
        browser: pick(browsers, index + 1),
        device: pick(devices, index + 2),
        os: pick(operatingSystems, index + 3),
        screen: pick(screens, index + 4),
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        utmContent: utm.utmContent,
        utmTerm: utm.utmTerm,
      }
    })

    for (let offset = 0; offset < rows.length; offset += batchSize) {
      await db.insert(event).values(rows.slice(offset, offset + batchSize))
    }

    return c.json({ inserted: rows.length }, 200)
  }
)
