import type { InferSelectModel } from "drizzle-orm"

import type { funnel } from "../../../../db/schema"

import { parseSteps } from "./schema"

export function serializeFunnel(row: InferSelectModel<typeof funnel>) {
  return {
    id: row.id,
    name: row.name,
    steps: parseSteps(row.steps),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
