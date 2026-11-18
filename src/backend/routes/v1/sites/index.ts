import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { createSite } from "./create"
import { listSites } from "./list"
import { revokeSite } from "./revoke"
import { simulateSite } from "./simulate"
import { siteStats } from "./stats"
import { replaceWriteKey } from "./write-key"

export const sites = new Hono<AppEnv>()
  .route("/", listSites)
  .route("/", createSite)
  .route("/", siteStats)
  .route("/", simulateSite)
  .route("/", revokeSite)
  .route("/", replaceWriteKey)
