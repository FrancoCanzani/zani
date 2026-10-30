import { Hono } from "hono"

import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import { serializeWorkspace } from "./lib/serialize"

export const getWorkspace = new Hono<AppEnv>().get(
  "/:slug",
  requireSession,
  requireWorkspaceMember,
  (c) => {
    const current = workspaceFromContext(c.var)
    return c.json(
      {
        workspace: serializeWorkspace(
          current.workspace,
          current.membership.role
        ),
      },
      200
    )
  }
)
