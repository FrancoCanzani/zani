import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { remove } from "./delete"
import { get } from "./get"
import { patch } from "./patch"
import { post } from "./post"

export const stripe = new Hono<AppEnv>()
  .route("/", get)
  .route("/", post)
  .route("/", patch)
  .route("/", remove)
