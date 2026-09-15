import type { Hono } from "hono"

import type { AppEnv } from "../types"

export function registerGetHealth(app: Hono<AppEnv>) {
  return app.get("/health", async (c) => {
    const dbResult = await c.env.DB.prepare("select 1 as ok").first<{
      ok: number
    }>()
    const kvList = await c.env.KV.list({ limit: 1 })

    return c.json({
      ok: true,
      bindings: {
        d1: dbResult?.ok === 1,
        kv: Array.isArray(kvList.keys),
      },
    })
  })
}
