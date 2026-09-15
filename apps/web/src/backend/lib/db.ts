import { drizzle } from "@workspace/db"
import * as schema from "@workspace/db/schema"

export function createDb(env: Env) {
  return drizzle(env.DB, { schema })
}
