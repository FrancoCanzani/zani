import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import { site, workspace, workspaceMember } from "../../../db/schema"
import { createAuth } from "../../../lib/auth"
import { createDb } from "../../../lib/db"
import { StripeError, stripeGet } from "../../../lib/stripe"
import type { AppEnv } from "../../../types"
import { saveConnection } from "../stripe/lib/connection"
import { oauthConfig, oauthHint, readState } from "../stripe/lib/oauth"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

type TokenResponse =
  | { access_token: string; livemode: boolean; stripe_user_id: string }
  | { error: string; error_description?: string }

export const get = new Hono<AppEnv>().get(
  "/callback",
  zValidator("query", callbackQuerySchema),
  async (c) => {
    const query = c.req.valid("query")
    const session = await createAuth(c.env, c.executionCtx).api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) {
      return c.redirect("/sign-in")
    }

    const state = query.state
      ? await readState(c.env.BETTER_AUTH_SECRET, query.state)
      : null
    if (!state || state.userId !== session.user.id) {
      return c.redirect("/businesses")
    }

    const settings = `/businesses/${encodeURIComponent(state.slug)}/sites/${encodeURIComponent(state.siteId)}/settings`
    const back = (result: "connected" | "denied" | "error") =>
      c.redirect(`${settings}?stripe=${result}#revenue`)

    const db = createDb(c.env)
    const [membership] = await db
      .select({ role: workspaceMember.role, siteId: site.id })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .innerJoin(site, eq(site.workspaceId, workspace.id))
      .where(
        and(
          eq(workspace.slug, state.slug),
          eq(workspaceMember.userId, session.user.id),
          eq(site.id, state.siteId)
        )
      )
      .limit(1)
    const role = membership ? parseWorkspaceRole(membership.role) : null
    if (!membership || !role || !canManageBusiness(role)) {
      return c.redirect("/businesses")
    }

    if (query.error || !query.code) {
      return back("denied")
    }

    const config = oauthConfig(c.env)
    if (!config) {
      return back("error")
    }

    const response = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: query.code,
      }),
    }).catch(() => null)
    const token = response
      ? ((await response.json().catch(() => null)) as TokenResponse | null)
      : null
    if (!token || "error" in token) {
      return back("error")
    }

    try {
      await stripeGet(token.access_token, "customers", { limit: "1" })
    } catch (error) {
      if (error instanceof StripeError) return back("error")
      throw error
    }

    await saveConnection(db, c.env.BETTER_AUTH_SECRET, {
      siteId: state.siteId,
      apiKey: token.access_token,
      apiKeyHint: oauthHint(token.stripe_user_id),
      livemode: token.livemode,
    })

    return back("connected")
  }
)
