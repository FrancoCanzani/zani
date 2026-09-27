import { Hono } from "hono"

import { AUTH_BASE_PATH } from "@shared/api"

import { api } from "./api"
import { createAuth } from "./lib/auth"
import { tryRedirect } from "./redirect"
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
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    const redirected = await tryRedirect(c.env, c.req.raw)
    if (redirected) {
      return redirected
    }
  }
  return c.env.ASSETS.fetch(c.req.raw)
})

export default worker
