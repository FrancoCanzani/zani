import { Hono } from "hono"

const app = new Hono<{ Bindings: Env }>()

app.get("/api/health", async (c) => {
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

export default app
