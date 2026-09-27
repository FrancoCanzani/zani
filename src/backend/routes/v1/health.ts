import { Hono } from "hono"

import type { AppEnv } from "../../types"

export const health = new Hono<AppEnv>().get("/", async (c) => {
  const dbResult = await c.env.DB.prepare("select 1 as ok").first<{
    ok: number
  }>()
  const kvList = await c.env.KV.list({ limit: 1 })

  return c.json(
    {
      ok: true as const,
      version: "v1" as const,
      bindings: {
        d1: dbResult?.ok === 1,
        kv: Array.isArray(kvList.keys),
        email: typeof c.env.EMAIL.send === "function",
      },
    },
    200
  )
})
