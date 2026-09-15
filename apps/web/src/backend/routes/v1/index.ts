import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { registerGetHealth } from "./health"
import { registerGetMe } from "./me"

const v1 = new Hono<AppEnv>()
registerGetHealth(v1)
registerGetMe(v1)

export { v1 }
