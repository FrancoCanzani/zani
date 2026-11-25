import { Hono } from "hono"

import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"

import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadConnection, serializeConnection } from "./lib/connection"
import {
  authorizeUrl,
  oauthConfig,
  oauthRedirectUri,
  signState,
} from "./lib/oauth"

export const get = new Hono<AppEnv>()
  .get("/", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId") ?? ""
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }
    const row = await loadConnection(db, matched.id)
    return c.json(
      { stripe: await serializeConnection(db, c.env, matched.id, row) },
      200
    )
  })
  .get("/oauth", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }
    const config = oauthConfig(c.env)
    if (!config) {
      return c.json({ error: "oauth_unavailable" as const }, 404)
    }
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId") ?? ""
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }
    const state = await signState(c.env.BETTER_AUTH_SECRET, {
      slug: current.workspace.slug,
      siteId: matched.id,
      userId: c.var.user.id,
    })
    return c.json(
      {
        url: authorizeUrl({
          clientId: config.clientId,
          redirectUri: oauthRedirectUri(c.req.url),
          state,
        }),
      },
      200
    )
  })
