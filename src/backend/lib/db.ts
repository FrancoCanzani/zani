import type { BatchItem } from "drizzle-orm/batch"
import { drizzle } from "drizzle-orm/d1"

import * as schema from "../db/schema"

export function createDb(env: Env) {
  return drizzle(env.DB, { schema })
}

export type Database = ReturnType<typeof createDb>

export async function runBatch(
  db: Database,
  statements: BatchItem<"sqlite">[]
) {
  const [first, ...rest] = statements
  if (!first) return
  await db.batch([first, ...rest])
}

export function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = []
  for (let offset = 0; offset < values.length; offset += size) {
    out.push(values.slice(offset, offset + size))
  }
  return out
}

// D1 allows about 100 bound parameters per statement.
export function rowsPerInsert(columns: number) {
  return Math.max(1, Math.floor(100 / columns))
}
