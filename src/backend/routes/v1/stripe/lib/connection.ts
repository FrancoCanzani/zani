import { count, eq } from "drizzle-orm"

import { stripeConnection, stripeCustomer } from "../../../../db/schema"
import type { createDb } from "../../../../lib/db"

import { parseSyncPhase } from "./sync"

type Database = ReturnType<typeof createDb>

export async function loadConnection(db: Database, siteId: string) {
  const [row] = await db
    .select()
    .from(stripeConnection)
    .where(eq(stripeConnection.siteId, siteId))
    .limit(1)
  return row ?? null
}

export async function serializeConnection(
  db: Database,
  siteId: string,
  row: typeof stripeConnection.$inferSelect | null
) {
  if (!row) return { connected: false as const }
  const [customers] = await db
    .select({ value: count() })
    .from(stripeCustomer)
    .where(eq(stripeCustomer.siteId, siteId))
  return {
    connected: true as const,
    apiKeyHint: row.apiKeyHint,
    livemode: row.livemode,
    webhookConfigured: row.webhookSecretCipher !== null,
    syncPhase: parseSyncPhase(row.syncPhase),
    syncedAt: row.syncedAt,
    syncError: row.syncError,
    lastWebhookAt: row.lastWebhookAt,
    customers: customers?.value ?? 0,
  }
}
