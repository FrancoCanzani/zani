import { Hono } from "hono"

import { AUTH_BASE_PATH } from "@shared/api"

import { createAuth } from "./lib/auth"
import { v1 } from "./routes"
import type { AppEnv } from "./types"

const app = new Hono<AppEnv>()

app.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) => {
  return createAuth(c.env, c.executionCtx).handler(c.req.raw)
})

app.route("/api/v1", v1)

export default app
