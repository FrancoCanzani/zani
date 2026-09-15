import { Hono } from "hono"

import { AUTH_BASE_PATH } from "@shared/api"

import { api } from "./api"
import { createAuth } from "./lib/auth"
import type { AppEnv } from "./types"

const worker = new Hono<AppEnv>()

worker.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) => {
  return createAuth(c.env, c.executionCtx).handler(c.req.raw)
})

worker.route("/", api)

export default worker
