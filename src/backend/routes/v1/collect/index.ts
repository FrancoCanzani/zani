import { Hono } from "hono"
import { cors } from "hono/cors"

import type { AppEnv } from "../../../types"

import { post } from "./post"

export const collect = new Hono<AppEnv>()
  .use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["POST"],
      allowHeaders: ["content-type", "x-write-key"],
    })
  )
  .route("/", post)
