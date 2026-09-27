import { eq } from "drizzle-orm"

import { link } from "./db/schema"
import { createDb } from "./lib/db"
import { readCachedLink, writeCachedLink } from "./routes/v1/links/lib/cache"
import { recordClick } from "./routes/v1/links/lib/clicks"

const CODE_PATH = /^\/([a-z0-9]{6})$/

export async function tryRedirect(env: Env, request: Request) {
  const code = CODE_PATH.exec(new URL(request.url).pathname)?.[1]
  if (!code) {
    return null
  }

  const cached = await readCachedLink(env.KV, code)
  const resolved = cached?.id ? cached : await loadLink(env, code)
  if (!resolved) {
    return null
  }
  if (resolved.disabled) {
    return new Response("Not found", { status: 404 })
  }

  if (request.method === "GET") {
    await recordClick(
      env,
      {
        id: resolved.id,
        workspaceId: resolved.workspaceId,
        code,
      },
      request
    )
  }

  return Response.redirect(resolved.destinationUrl, 302)
}

async function loadLink(env: Env, code: string) {
  const db = createDb(env)
  const [row] = await db
    .select({
      id: link.id,
      workspaceId: link.workspaceId,
      destinationUrl: link.destinationUrl,
      disabledAt: link.disabledAt,
    })
    .from(link)
    .where(eq(link.code, code))
    .limit(1)

  if (!row) {
    return null
  }

  const cached = {
    id: row.id,
    workspaceId: row.workspaceId,
    destinationUrl: row.destinationUrl,
    disabled: row.disabledAt != null,
  }
  await writeCachedLink(env.KV, code, cached)
  return cached
}
