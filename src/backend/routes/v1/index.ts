import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { collect } from "./collect"
import { health } from "./health"
import { invites } from "./invites"
import { stripe } from "./stripe"
import { workspaces } from "./workspaces"

export const v1 = new Hono<AppEnv>()
  .route("/health", health)
  .route("/collect", collect)
  .route("/workspaces", workspaces)
  .route("/invites", invites)
  .route("/stripe", stripe)
