import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { workspace } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import {
  canManageBusiness,
  parseWorkspaceRole,
  updateWorkspaceBodySchema,
} from "./lib/schema"

export const updateWorkspace = new Hono<AppEnv>().patch(
  "/:slug",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateWorkspaceBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }

    const body = c.req.valid("json")
    const db = createDb(c.env)
    const updatedAt = nowMs()

    await db
      .update(workspace)
      .set({ name: body.name, updatedAt })
      .where(eq(workspace.id, current.workspace.id))

    return c.json(
      {
        workspace: {
          id: current.workspace.id,
          name: body.name,
          slug: current.workspace.slug,
          plan: current.workspace.plan,
          role: current.membership.role,
          defaultCurrency: current.workspace.defaultCurrency,
          invoiceNumberPrefix: current.workspace.invoiceNumberPrefix,
          defaultPaymentTerms: current.workspace.defaultPaymentTerms,
          defaultTaxName: current.workspace.defaultTaxName,
          defaultTaxRateBps: current.workspace.defaultTaxRateBps,
          taxInclusive: current.workspace.taxInclusive,
          createdAt: current.workspace.createdAt,
        },
      },
      200
    )
  }
)
