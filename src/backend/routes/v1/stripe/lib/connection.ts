import { count, eq } from "drizzle-orm"

import {
  mrrSnapshot,
  revenueMovement,
  stripeConnection,
  stripeCustomer,
  stripePayment,
} from "../../../../db/schema"
import type { Database } from "../../../../lib/db"
import { encryptSecret } from "../../../../lib/secrets"
import type { AppEnv } from "../../../../types"

import { oauthAccount, oauthConfig } from "./oauth"
import { parseSyncPhase } from "./sync"

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
  env: AppEnv["Bindings"],
  siteId: string,
  row: typeof stripeConnection.$inferSelect | null
) {
  const oauthAvailable = oauthConfig(env) !== null
  if (!row) return { connected: false as const, oauthAvailable }
  const account = oauthAccount(row.apiKeyHint)
  const [customers] = await db
    .select({ value: count() })
    .from(stripeCustomer)
    .where(eq(stripeCustomer.siteId, siteId))
  return {
    connected: true as const,
    oauthAvailable,
    method: account ? ("oauth" as const) : ("key" as const),
    account,
    apiKeyHint: account ? "" : row.apiKeyHint,
    livemode: row.livemode,
    webhookConfigured: row.webhookSecretCipher !== null,
    syncPhase: parseSyncPhase(row.syncPhase),
    syncedAt: row.syncedAt,
    syncError: row.syncError,
    lastWebhookAt: row.lastWebhookAt,
    customers: customers?.value ?? 0,
  }
}

export function clearRevenueStatements(db: Database, siteId: string) {
  return [
    db.delete(revenueMovement).where(eq(revenueMovement.siteId, siteId)),
    db.delete(mrrSnapshot).where(eq(mrrSnapshot.siteId, siteId)),
    db.delete(stripePayment).where(eq(stripePayment.siteId, siteId)),
    db.delete(stripeCustomer).where(eq(stripeCustomer.siteId, siteId)),
  ] as const
}

export async function saveConnection(
  db: Database,
  secret: string,
  input: {
    siteId: string
    apiKey: string
    apiKeyHint: string
    livemode: boolean
    webhookSecret?: string
  }
) {
  const now = Date.now()
  const existing = await loadConnection(db, input.siteId)
  // Revenue rows come from the previous account; keeping them would mix two accounts' MRR.
  const replacing =
    existing !== null && existing.apiKeyHint !== input.apiKeyHint
  const values = {
    siteId: input.siteId,
    apiKeyCipher: await encryptSecret(secret, input.apiKey),
    apiKeyHint: input.apiKeyHint,
    webhookSecretCipher: input.webhookSecret
      ? await encryptSecret(secret, input.webhookSecret)
      : replacing
        ? null
        : (existing?.webhookSecretCipher ?? null),
    livemode: input.livemode,
    syncPhase: "customers",
    syncCursor: null,
    syncedAt: null,
    syncError: null,
    createdAt: now,
    updatedAt: now,
  }
  const upsert = db
    .insert(stripeConnection)
    .values(values)
    .onConflictDoUpdate({
      target: stripeConnection.siteId,
      set: { ...values, createdAt: undefined },
    })
  if (replacing) {
    await db.batch([...clearRevenueStatements(db, input.siteId), upsert])
  } else {
    await upsert
  }
}
