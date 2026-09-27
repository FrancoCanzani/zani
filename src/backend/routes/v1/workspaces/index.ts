import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { links } from "../links"

import { createWorkspace } from "./create"
import { getWorkspace } from "./get"
import { createInvite } from "./invite"
import { listWorkspaces } from "./list"
import { listMembers } from "./members"

export const workspaces = new Hono<AppEnv>()
  .route("/", listWorkspaces)
  .route("/", createWorkspace)
  .route("/", getWorkspace)
  .route("/", listMembers)
  .route("/", createInvite)
  .route("/:slug/links", links)
