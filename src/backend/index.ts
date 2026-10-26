import { Hono } from "hono"

import { api } from "./api"
import { createAuth } from "./lib/auth"
import { AUTH_BASE_PATH } from "./lib/paths"
import type { AppEnv } from "./types"

const worker = new Hono<AppEnv>()

worker.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) => {
  return createAuth(c.env, c.executionCtx).handler(c.req.raw)
})

worker.route("/", api)

worker.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found" as const }, 404)
  }
  return c.env.ASSETS.fetch(c.req.raw)
})

export default worker
