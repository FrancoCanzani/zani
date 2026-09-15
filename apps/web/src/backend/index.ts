import { Hono } from "hono"

import { api } from "./routes"
import type { AppEnv } from "./types"

const app = new Hono<AppEnv>()

app.route("/api", api)

export default app
