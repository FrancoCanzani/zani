import { Hono } from "hono"

import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"

export const getWorkspace = new Hono<AppEnv>().get(
  "/:slug",
  requireSession,
  requireWorkspaceMember,
  (c) => {
    const current = workspaceFromContext(c.var)
    return c.json(
      {
        workspace: {
          id: current.workspace.id,
          name: current.workspace.name,
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
