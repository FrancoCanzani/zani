import { zValidator } from "@hono/zod-validator"
import { and, asc, eq, or, sql } from "drizzle-orm"
import { Hono } from "hono"

import { customer } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { listCustomersQuerySchema } from "./lib/schema"
import { serializeCustomer } from "./lib/serialize"

export const listCustomers = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("query", listCustomersQuerySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const { q } = c.req.valid("query")
    const db = createDb(c.env)

    const filters = [eq(customer.workspaceId, current.workspace.id)]
    if (q) {
      const pattern = `%${q.toLowerCase()}%`
      filters.push(
        or(
          sql`lower(${customer.name}) like ${pattern}`,
          sql`lower(coalesce(${customer.email}, '')) like ${pattern}`,
          sql`lower(coalesce(${customer.phone}, '')) like ${pattern}`
        )!
      )
    }

    const rows = await db
      .select()
      .from(customer)
      .where(and(...filters))
      .orderBy(asc(customer.name))
      .limit(50)

    return c.json({ customers: rows.map(serializeCustomer) }, 200)
  }
)
