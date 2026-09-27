import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { readCachedLink } from "./links/lib/cache"

export const health = new Hono<AppEnv>().get("/", async (c) => {
  const dbResult = await c.env.DB.prepare("select 1 as ok").first<{
    ok: number
  }>()
  let kv = true
  try {
    await readCachedLink(c.env.KV, "__health__")
  } catch {
    kv = false
  }

  return c.json(
    {
      ok: true as const,
      version: "v1" as const,
      bindings: {
        d1: dbResult?.ok === 1,
        kv,
        clicks: typeof c.env.CLICKS.writeDataPoint === "function",
        email: typeof c.env.EMAIL.send === "function",
      },
    },
    200
  )
})
