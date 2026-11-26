import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { collect } from "./collect"
import { events } from "./events"
import { health } from "./health"
import { identify } from "./identify"
import { invites } from "./invites"
import { stripeOauth } from "./stripe-oauth"
import { stripeWebhooks } from "./stripe-webhooks"
import { workspaces } from "./workspaces"

export const v1 = new Hono<AppEnv>()
  .route("/health", health)
  .route("/collect", collect)
  .route("/events", events)
  .route("/identify", identify)
  .route("/stripe-oauth", stripeOauth)
  .route("/stripe-webhooks", stripeWebhooks)
  .route("/workspaces", workspaces)
  .route("/invites", invites)
