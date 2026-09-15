import type { Hono } from "hono"

import { createAuth } from "../../lib/auth"
import type { AppEnv } from "../../types"

export function registerGetMe(app: Hono<AppEnv>) {
  return app.get("/me", async (c) => {
    const auth = createAuth(c.env, c.executionCtx)
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      return c.json({ error: "unauthorized" }, 401)
    }

    return c.json({ user: session.user })
  })
}
