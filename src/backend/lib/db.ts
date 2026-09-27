import { drizzle } from "drizzle-orm/d1"

import * as schema from "../db/schema"

export function createDb(env: Env) {
  return drizzle(env.DB, { schema })
}
