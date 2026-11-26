import {
  and,
  avg,
  count,
  eq,
  gte,
  isNotNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"

import {
  revenueMovement,
  stripeCustomer,
  stripePayment,
  visitorIdentity,
} from "../../../../db/schema"
import type { Database } from "../../../../lib/db"
import { asNumber, type StatsRange } from "../../sites/lib/stats"

const dayMs = 24 * 60 * 60 * 1000
const timingSampleLimit = 5000

type Scope = {
  siteId: string
  currency: string
  range: StatsRange
  filters: SQL[]
}

export type CustomerRow = {
  key: string | null
  customers: number
  newMrr: number
  mrr: number
  revenue: number
  ltv: number | null
  daysToPay: number | null
}

function customerJoin() {
  return and(
    eq(stripeCustomer.siteId, stripePayment.siteId),
    eq(stripeCustomer.id, stripePayment.customerId)
  )
}

function paidInRange(scope: Scope) {
  return and(
    eq(stripeCustomer.siteId, scope.siteId),
    eq(stripeCustomer.currency, scope.currency),
    gte(stripeCustomer.firstPaidAt, scope.range.start),
    lt(stripeCustomer.firstPaidAt, scope.range.end),
    ...scope.filters
  )
}

function paymentsInRange(scope: Scope) {
  return and(
    eq(stripePayment.siteId, scope.siteId),
    eq(stripePayment.currency, scope.currency),
    gte(stripePayment.at, scope.range.start),
    lt(stripePayment.at, scope.range.end),
    ...scope.filters
  )
}

export function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2
}

function daysBetween(from: number, to: number) {
  return Math.max(0, (to - from) / dayMs)
}

export async function customerRowsByKey(
  db: Database,
  scope: Scope & { key: SQLiteColumn; detailed: boolean }
): Promise<CustomerRow[]> {
  const { key } = scope
  const netRevenue = sql<number>`sum(${stripePayment.amount} - ${stripePayment.refunded})`

  const [newMrr, customers, payments, lifetime, timing] = await Promise.all([
    db
      .select({
        key,
        newMrr: sql<number>`sum(${revenueMovement.amount})`,
      })
      .from(revenueMovement)
      .innerJoin(
        stripeCustomer,
        and(
          eq(stripeCustomer.siteId, revenueMovement.siteId),
          eq(stripeCustomer.id, revenueMovement.customerId)
        )
      )
      .leftJoin(
        visitorIdentity,
        eq(visitorIdentity.id, stripeCustomer.identityId)
      )
      .where(
        and(
          eq(revenueMovement.siteId, scope.siteId),
          eq(revenueMovement.kind, "new"),
          eq(revenueMovement.currency, scope.currency),
          gte(revenueMovement.at, scope.range.start),
          lt(revenueMovement.at, scope.range.end),
          ...scope.filters
        )
      )
      .groupBy(key),
    db
      .select({
        key,
        customers: count(),
        mrr: sql<number>`sum(${stripeCustomer.mrr})`,
      })
      .from(stripeCustomer)
      .leftJoin(
        visitorIdentity,
        eq(visitorIdentity.id, stripeCustomer.identityId)
      )
      .where(paidInRange(scope))
      .groupBy(key),
    scope.detailed
      ? db
          .select({ key, revenue: netRevenue })
          .from(stripePayment)
          .innerJoin(stripeCustomer, customerJoin())
          .leftJoin(
            visitorIdentity,
            eq(visitorIdentity.id, stripeCustomer.identityId)
          )
          .where(paymentsInRange(scope))
          .groupBy(key)
      : [],
    scope.detailed
      ? db
          .select({ key, ltv: avg(stripeCustomer.revenue) })
          .from(stripeCustomer)
          .leftJoin(
            visitorIdentity,
            eq(visitorIdentity.id, stripeCustomer.identityId)
          )
          .where(
            and(
              eq(stripeCustomer.siteId, scope.siteId),
              eq(stripeCustomer.currency, scope.currency),
              isNotNull(stripeCustomer.firstPaidAt),
              ...scope.filters
            )
          )
          .groupBy(key)
      : [],
    scope.detailed
      ? db
          .select({
            key,
            firstSeenAt: visitorIdentity.firstSeenAt,
            firstPaidAt: stripeCustomer.firstPaidAt,
          })
          .from(stripeCustomer)
          .innerJoin(
            visitorIdentity,
            eq(visitorIdentity.id, stripeCustomer.identityId)
          )
          .where(paidInRange(scope))
          .limit(timingSampleLimit)
      : [],
  ])

  const rows = new Map<string | null, CustomerRow>()
  const rowFor = (value: unknown) => {
    const label = value === null || value === undefined ? null : String(value)
    const existing = rows.get(label)
    if (existing) return existing
    const created: CustomerRow = {
      key: label,
      customers: 0,
      newMrr: 0,
      mrr: 0,
      revenue: 0,
      ltv: null,
      daysToPay: null,
    }
    rows.set(label, created)
    return created
  }
  for (const row of newMrr) rowFor(row.key).newMrr += asNumber(row.newMrr)
  for (const row of customers) {
    const target = rowFor(row.key)
    target.customers += row.customers
    target.mrr += asNumber(row.mrr)
  }
  for (const row of payments) rowFor(row.key).revenue += asNumber(row.revenue)
  for (const row of lifetime) {
    if (row.ltv === null) continue
    rowFor(row.key).ltv = Math.round(asNumber(row.ltv))
  }
  const days = new Map<string | null, number[]>()
  for (const row of timing) {
    if (row.firstPaidAt === null) continue
    const label = row.key === null ? null : String(row.key)
    const list = days.get(label) ?? []
    list.push(daysBetween(row.firstSeenAt, row.firstPaidAt))
    days.set(label, list)
  }
  for (const [label, values] of days) {
    rowFor(label).daysToPay = median(values)
  }
  return [...rows.values()]
}

export async function paymentSummary(db: Database, scope: Scope) {
  const scoped = scope.filters.length > 0
  const paymentQuery = db
    .select({
      revenue: sql<number>`coalesce(sum(${stripePayment.amount} - ${stripePayment.refunded}), 0)`,
      refunds: sql<number>`coalesce(sum(${stripePayment.refunded}), 0)`,
      oneTime: sql<number>`coalesce(sum(case when ${stripePayment.invoiceId} = '' then ${stripePayment.amount} - ${stripePayment.refunded} else 0 end), 0)`,
      payments: count(),
    })
    .from(stripePayment)
  const lifetimeQuery = db
    .select({ ltv: avg(stripeCustomer.revenue) })
    .from(stripeCustomer)
  const trialQuery = db
    .select({
      trials: count(),
      converted: sql<number>`sum(case when ${stripeCustomer.firstPaidAt} is not null then 1 else 0 end)`,
    })
    .from(stripeCustomer)
  const timingQuery = db
    .select({
      firstSeenAt: visitorIdentity.firstSeenAt,
      firstPaidAt: stripeCustomer.firstPaidAt,
    })
    .from(stripeCustomer)
    .innerJoin(
      visitorIdentity,
      eq(visitorIdentity.id, stripeCustomer.identityId)
    )
  const identityOn = eq(visitorIdentity.id, stripeCustomer.identityId)
  const lifetimeWhere = and(
    eq(stripeCustomer.siteId, scope.siteId),
    eq(stripeCustomer.currency, scope.currency),
    isNotNull(stripeCustomer.firstPaidAt),
    ...scope.filters
  )
  const trialWhere = and(
    eq(stripeCustomer.siteId, scope.siteId),
    gte(stripeCustomer.trialStartedAt, scope.range.start),
    lt(stripeCustomer.trialStartedAt, scope.range.end),
    ...scope.filters
  )

  const [[paid], [lifetime], [trials], timing, [anyPayment]] =
    await Promise.all([
      scoped
        ? paymentQuery
            .innerJoin(stripeCustomer, customerJoin())
            .innerJoin(visitorIdentity, identityOn)
            .where(paymentsInRange(scope))
        : paymentQuery.where(paymentsInRange(scope)),
      scoped
        ? lifetimeQuery
            .innerJoin(visitorIdentity, identityOn)
            .where(lifetimeWhere)
        : lifetimeQuery.where(lifetimeWhere),
      scoped
        ? trialQuery.innerJoin(visitorIdentity, identityOn).where(trialWhere)
        : trialQuery.where(trialWhere),
      timingQuery.where(paidInRange(scope)).limit(timingSampleLimit),
      db
        .select({ id: stripePayment.id })
        .from(stripePayment)
        .where(eq(stripePayment.siteId, scope.siteId))
        .limit(1),
    ])

  const trialCount = trials?.trials ?? 0
  const trialConverted = asNumber(trials?.converted)
  return {
    hasPayments: anyPayment !== undefined,
    revenue: asNumber(paid?.revenue),
    refunds: asNumber(paid?.refunds),
    oneTimeRevenue: asNumber(paid?.oneTime),
    payments: paid?.payments ?? 0,
    ltv:
      lifetime?.ltv === null || lifetime?.ltv === undefined
        ? null
        : Math.round(asNumber(lifetime.ltv)),
    trials: trialCount,
    trialConversions: trialConverted,
    medianDaysToPay: median(
      timing.flatMap((row) =>
        row.firstPaidAt === null
          ? []
          : [daysBetween(row.firstSeenAt, row.firstPaidAt)]
      )
    ),
  }
}
