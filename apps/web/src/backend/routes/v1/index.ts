import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { health } from "./health"
import { invites } from "./invites"
import { me } from "./me"
import { workspaces } from "./workspaces"

export const v1 = new Hono<AppEnv>()
  .route("/health", health)
  .route("/me", me)
  .route("/workspaces", workspaces)
  .route("/invites", invites)
