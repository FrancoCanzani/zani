import type { BatchItem } from "drizzle-orm/batch"
import { and, eq, isNull, or } from "drizzle-orm"

import {
  mrrSnapshot,
  revenueMovement,
  stripeCustomer,
  visitorIdentity,
} from "../db/schema"

import type { createDb } from "./db"
import { newId, sha256Hex } from "./utils"

type Database = ReturnType<typeof createDb>

export const movementKinds = [
  "new",
  "expansion",
  "contraction",
  "churn",
  "reactivation",
] as const

export type MovementKind = (typeof movementKinds)[number]

export type Snapshot = {
  sourceId: string
  subscriptionId: string
  at: number
  mrr: number
  currency: string
}

export type Movement = {
  kind: MovementKind
  amount: number
  mrrAfter: number
  currency: string
  at: number
}

export function movementsFromSnapshots(snapshots: Snapshot[]): Movement[] {
  const sorted = [...snapshots].sort(
    (a, b) => a.at - b.at || a.sourceId.localeCompare(b.sourceId)
  )
  const bySubscription = new Map<string, number>()
  const movements: Movement[] = []
  let total = 0
  let everPaid = false

  for (let index = 0; index < sorted.length; index += 1) {
    const snapshot = sorted[index]!
    bySubscription.set(snapshot.subscriptionId, snapshot.mrr)
    // A plan switch often ends one subscription and starts another at the same instant; settle both before comparing.
    if (sorted[index + 1]?.at === snapshot.at) continue

    let next = 0
    for (const value of bySubscription.values()) next += value
    if (next === total) continue

    const kind: MovementKind =
      total === 0
        ? everPaid
          ? "reactivation"
          : "new"
        : next === 0
          ? "churn"
          : next > total
            ? "expansion"
            : "contraction"
    movements.push({
      kind,
      amount: next - total,
      mrrAfter: next,
      currency: snapshot.currency,
      at: snapshot.at,
    })
    if (next > 0) everPaid = true
    total = next
  }

  return movements
}

export async function runBatch(
  db: Database,
  statements: BatchItem<"sqlite">[]
) {
  const [first, ...rest] = statements
  if (!first) return
  await db.batch([first, ...rest])
}

export function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = []
  for (let offset = 0; offset < values.length; offset += size) {
    out.push(values.slice(offset, offset + size))
  }
  return out
}

// D1 allows about 100 bound parameters per statement.
export function rowsPerInsert(columns: number) {
  return Math.max(1, Math.floor(100 / columns))
}

export async function recomputeCustomer(
  db: Database,
  siteId: string,
  customerId: string
) {
  const snapshots = await db
    .select({
      sourceId: mrrSnapshot.sourceId,
      subscriptionId: mrrSnapshot.subscriptionId,
      at: mrrSnapshot.at,
      mrr: mrrSnapshot.mrr,
      currency: mrrSnapshot.currency,
    })
    .from(mrrSnapshot)
    .where(
      and(
        eq(mrrSnapshot.siteId, siteId),
        eq(mrrSnapshot.customerId, customerId)
      )
    )

  const movements = movementsFromSnapshots(snapshots)
  const last = movements.at(-1)
  const firstPaid = movements.find((movement) => movement.amount > 0)
  const rows = movements.map((movement) => ({
    id: newId(),
    siteId,
    customerId,
    ...movement,
  }))

  await runBatch(db, [
    db
      .delete(revenueMovement)
      .where(
        and(
          eq(revenueMovement.siteId, siteId),
          eq(revenueMovement.customerId, customerId)
        )
      ),
    ...chunk(rows, rowsPerInsert(8)).map((part) =>
      db.insert(revenueMovement).values(part)
    ),
    db
      .update(stripeCustomer)
      .set({
        mrr: last?.mrrAfter ?? 0,
        currency: last?.currency ?? "",
        firstPaidAt: firstPaid?.at ?? null,
        churnedAt: last?.kind === "churn" ? last.at : null,
      })
      .where(
        and(
          eq(stripeCustomer.siteId, siteId),
          eq(stripeCustomer.id, customerId)
        )
      ),
  ])
}

export async function emailHash(siteId: string, email: string) {
  return sha256Hex(`${siteId}\0${email.trim().toLowerCase()}`)
}

export async function findIdentityId(
  db: Database,
  siteId: string,
  input: { userRef: string | null; email: string }
) {
  const conditions = []
  if (input.userRef) conditions.push(eq(visitorIdentity.userRef, input.userRef))
  if (input.email) {
    conditions.push(
      eq(visitorIdentity.emailHash, await emailHash(siteId, input.email))
    )
  }
  const [matchCondition, ...others] = conditions
  if (!matchCondition) return null

  const rows = await db
    .select({ id: visitorIdentity.id, userRef: visitorIdentity.userRef })
    .from(visitorIdentity)
    .where(
      and(eq(visitorIdentity.siteId, siteId), or(matchCondition, ...others))
    )
    .limit(5)

  const byRef = rows.find((row) => row.userRef === input.userRef)
  return (byRef ?? rows[0])?.id ?? null
}

export async function linkCustomersToIdentity(
  db: Database,
  siteId: string,
  identity: { id: string; userRef: string; emailHash: string | null }
) {
  await db
    .update(stripeCustomer)
    .set({ identityId: identity.id })
    .where(
      and(
        eq(stripeCustomer.siteId, siteId),
        isNull(stripeCustomer.identityId),
        eq(stripeCustomer.userRef, identity.userRef)
      )
    )

  if (!identity.emailHash) return
  await db
    .update(stripeCustomer)
    .set({ identityId: identity.id })
    .where(
      and(
        eq(stripeCustomer.siteId, siteId),
        isNull(stripeCustomer.identityId),
        eq(stripeCustomer.emailHash, identity.emailHash)
      )
    )
}
