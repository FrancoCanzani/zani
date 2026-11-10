import { and, eq } from "drizzle-orm"

import { site } from "../../../../db/schema"
import type { createDb } from "../../../../lib/db"

type Database = ReturnType<typeof createDb>

export async function loadSite(
  db: Database,
  workspaceId: string,
  siteId: string
) {
  const [row] = await db
    .select()
    .from(site)
    .where(and(eq(site.id, siteId), eq(site.workspaceId, workspaceId)))
    .limit(1)

  return row ?? null
}
