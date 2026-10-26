import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { customers } from "../customers"
import { estimates } from "../estimates"

import { createWorkspace } from "./create"
import { getWorkspace } from "./get"
import { createInvite } from "./invite"
import { listWorkspaces } from "./list"
import { listMembers } from "./members"
import { updateWorkspace } from "./update"

export const workspaces = new Hono<AppEnv>()
  .route("/", listWorkspaces)
  .route("/", createWorkspace)
  .route("/", getWorkspace)
  .route("/", updateWorkspace)
  .route("/", listMembers)
  .route("/", createInvite)
  .route("/:slug/customers", customers)
  .route("/:slug/estimates", estimates)
