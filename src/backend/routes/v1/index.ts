import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { collect } from "./collect"
import { health } from "./health"
import { identify } from "./identify"
import { invites } from "./invites"
import { stripeWebhooks } from "./stripe-webhooks"
import { workspaces } from "./workspaces"

export const v1 = new Hono<AppEnv>()
  .route("/health", health)
  .route("/collect", collect)
  .route("/identify", identify)
  .route("/stripe-webhooks", stripeWebhooks)
  .route("/workspaces", workspaces)
  .route("/invites", invites)
