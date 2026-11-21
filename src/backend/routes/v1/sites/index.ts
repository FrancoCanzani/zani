import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { get } from "./get"
import { patch } from "./patch"
import { post } from "./post"

export const sites = new Hono<AppEnv>()
  .route("/", get)
  .route("/", post)
  .route("/", patch)
