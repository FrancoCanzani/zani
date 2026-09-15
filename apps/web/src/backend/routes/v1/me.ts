import { Hono } from "hono"

import { requireSession } from "../../middleware/session"
import type { AppEnv } from "../../types"

export const me = new Hono<AppEnv>().get("/", requireSession, (c) => {
  return c.json({ user: c.var.user }, 200)
})
