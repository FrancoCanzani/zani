import { Hono } from "hono"

import type { AppEnv } from "../types"
import { registerGetHealth } from "./health"

const api = new Hono<AppEnv>()
registerGetHealth(api)

export { api, registerGetHealth }
