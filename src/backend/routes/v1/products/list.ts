import { zValidator } from "@hono/zod-validator"
import { and, asc, eq, isNull, like, or } from "drizzle-orm"
import { Hono } from "hono"

import { product } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { listProductsQuerySchema } from "./lib/schema"
import { serializeProduct } from "./lib/serialize"

export const listProducts = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("query", listProductsQuerySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const { q, includeArchived } = c.req.valid("query")
    const db = createDb(c.env)

    const filters = [eq(product.workspaceId, current.workspace.id)]
    if (!includeArchived) {
      filters.push(isNull(product.archivedAt))
    }
    if (q) {
      const pattern = `%${q}%`
      filters.push(
        or(
          like(product.name, pattern),
          like(product.description, pattern)
        )!
      )
    }

    const rows = await db
      .select()
      .from(product)
      .where(and(...filters))
      .orderBy(asc(product.name))

    return c.json({ products: rows.map(serializeProduct) }, 200)
  }
)
