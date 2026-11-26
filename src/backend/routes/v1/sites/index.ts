import { Hono } from "hono"

import type { AppEnv } from "../../../types"
import { activity } from "../activity"
import { funnels } from "../funnels"
import { revenue } from "../revenue"
import { stripe } from "../stripe"

import { get } from "./get"
import { patch } from "./patch"
import { post } from "./post"

export const sites = new Hono<AppEnv>()
  .route("/", get)
  .route("/", post)
  .route("/", patch)
  .route("/:siteId/stripe", stripe)
  .route("/:siteId/revenue", revenue)
  .route("/:siteId/activity", activity)
  .route("/:siteId/funnels", funnels)
