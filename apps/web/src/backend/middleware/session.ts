import { factory } from "../factory"
import { createAuth } from "../lib/auth"

export const requireSession = factory.createMiddleware(async (c, next) => {
  const payload = await createAuth(c.env, c.executionCtx).api.getSession({
    headers: c.req.raw.headers,
  })

  if (!payload) {
    return c.json({ error: "unauthorized" as const }, 401)
  }

  c.set("user", payload.user)
  c.set("session", payload.session)
  await next()
})
