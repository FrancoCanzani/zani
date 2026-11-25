import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { stripeConnection } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { clearRevenueStatements, loadConnection } from "./lib/connection"
import { oauthAccount, oauthConfig } from "./lib/oauth"

export const remove = new Hono<AppEnv>().delete(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
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

    const existing = await loadConnection(db, matched.id)
    const account = existing ? oauthAccount(existing.apiKeyHint) : null
    const oauth = oauthConfig(c.env)
    if (account && oauth) {
      // Best effort: the local disconnect must succeed even if Stripe is unreachable.
      await fetch("https://connect.stripe.com/oauth/deauthorize", {
        method: "POST",
        headers: {
          authorization: `Bearer ${oauth.secretKey}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: oauth.clientId,
          stripe_user_id: account,
        }),
      }).catch(() => null)
    }

    await db.batch([
      db
        .delete(stripeConnection)
        .where(eq(stripeConnection.siteId, matched.id)),
      ...clearRevenueStatements(db, matched.id),
    ])

    return c.json(
      { stripe: { connected: false as const, oauthAvailable: oauth !== null } },
      200
    )
  }
)
