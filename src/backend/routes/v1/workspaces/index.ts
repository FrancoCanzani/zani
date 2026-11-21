import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { sites } from "../sites"

import { remove } from "./delete"
import { get } from "./get"
import { patch } from "./patch"
import { post } from "./post"

export const workspaces = new Hono<AppEnv>()
  .route("/", get)
  .route("/", post)
  .route("/", patch)
  .route("/", remove)
  .route("/:slug/sites", sites)
