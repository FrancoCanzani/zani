import { createDb } from "../../../../lib/db"

import { listStripeSubscriptions } from "./api"
import { upsertStripeSubscription } from "./ledger"

type Db = ReturnType<typeof createDb>

export async function syncStripeSubscriptions(
  db: Db,
  workspaceId: string,
  apiKey: string
) {
  let startingAfter: string | undefined
  let pages = 0
  let synced = 0

  while (pages < 10) {
    const listed = await listStripeSubscriptions(apiKey, startingAfter)
    if (!listed.ok) {
      return { ok: false as const, status: listed.status, synced }
    }
    for (const subscription of listed.data.data) {
      await upsertStripeSubscription(db, workspaceId, subscription)
      synced += 1
    }
    if (!listed.data.has_more || listed.data.data.length === 0) break
    startingAfter = listed.data.data[listed.data.data.length - 1]?.id
    if (!startingAfter) break
    pages += 1
  }

  return { ok: true as const, synced }
}
