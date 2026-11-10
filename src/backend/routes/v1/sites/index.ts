import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { createSite } from "./create"
import { listSites } from "./list"
import { revokeSite } from "./revoke"
import { siteStats } from "./stats"

export const sites = new Hono<AppEnv>()
  .route("/", listSites)
  .route("/", createSite)
  .route("/", siteStats)
  .route("/", revokeSite)
