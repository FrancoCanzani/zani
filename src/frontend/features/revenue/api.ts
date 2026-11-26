import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import {
  rangeQuery,
  type StatsFilters,
  type StatsRange,
} from "@features/sites/api"
import type { Breakdown } from "@features/sites/panels"
import type {
  AttributionDimension,
  FilterKey,
  Touch,
} from "@features/sites/search"
import { api, requireJson } from "@lib/api"

export type RevenuePoint = {
  bucket: number
  signups: number
  newMrr: number
  newCustomers: number
  mrr: number
}

export type RevenueOverview = {
  connected: boolean
  hasData: boolean
  currency: string
  otherCurrencies: number
  identifiedCustomers: number
  ignoredFilters: FilterKey[]
  payingCustomers: number
  arpa: number
  mrr: number
  mrrStart: number
  newMrr: number
  expansionMrr: number
  contractionMrr: number
  churnedMrr: number
  netNewMrr: number
  newCustomers: number
  churnedCustomers: number
  revenueChurnRate: number
  signups: number
  hasPayments: boolean
  revenue: number
  refunds: number
  oneTimeRevenue: number
  payments: number
  ltv: number | null
  trials: number
  trialConversions: number
  medianDaysToPay: number | null
  points: RevenuePoint[]
}

export type RevenueBreakdownRow = {
  key: string
  signups: number
  customers: number
  newMrr: number
}

export type AttributionRow = {
  key: string
  signups: number
  customers: number
  newMrr: number
  mrr: number
  revenue: number
  ltv: number | null
  daysToPay: number | null
}

export type RevenueCustomer = {
  id: string
  email: string
  name: string
  mrr: number
  currency: string
  firstPaidAt: number | null
  churnedAt: number | null
  signedUpAt: number | null
  firstSource: string | null
  firstCampaign: string | null
  firstLanding: string | null
  lastSource: string | null
  country: string | null
}

export type SyncPhase =
  | "customers"
  | "checkout_sessions"
  | "subscriptions"
  | "invoices"
  | "charges"
  | "recompute"
  | "done"

export type StripeStatus =
  | { connected: false; oauthAvailable: boolean }
  | {
      connected: true
      oauthAvailable: boolean
      method: "oauth" | "key"
      account: string | null
      apiKeyHint: string
      livemode: boolean
      webhookConfigured: boolean
      syncPhase: SyncPhase
      syncedAt: number | null
      syncError: string | null
      lastWebhookAt: number | null
      customers: number
    }

export type ConnectedStripeStatus = Extract<StripeStatus, { connected: true }>

const revenueStaleMs = 30_000

export function revenueOverviewQueryOptions(
  slug: string,
  siteId: string,
  range: StatsRange,
  filters: StatsFilters
) {
  return queryOptions({
    queryKey: ["revenue", slug, siteId, "overview", range, filters] as const,
    queryFn: async () =>
      requireJson<RevenueOverview>(
        await api.workspaces[":slug"].sites[":siteId"].revenue.$get({
          param: { slug, siteId },
          query: { ...rangeQuery(range, filters), grain: range.grain },
        }),
        "mrr"
      ),
    staleTime: revenueStaleMs,
    placeholderData: keepPreviousData,
  })
}

export function revenueBreakdownQueryOptions(
  slug: string,
  siteId: string,
  by: Breakdown,
  range: StatsRange,
  filters: StatsFilters
) {
  return queryOptions({
    queryKey: [
      "revenue",
      slug,
      siteId,
      "breakdown",
      by,
      range,
      filters,
    ] as const,
    queryFn: async () =>
      requireJson<{
        currency: string
        supported: boolean
        rows: RevenueBreakdownRow[]
      }>(
        await api.workspaces[":slug"].sites[":siteId"].revenue.breakdown.$get({
          param: { slug, siteId },
          query: { ...rangeQuery(range, filters), by },
        }),
        "rows"
      ),
    staleTime: revenueStaleMs,
    placeholderData: keepPreviousData,
  })
}

export function attributionQueryOptions(
  slug: string,
  siteId: string,
  range: StatsRange,
  filters: StatsFilters,
  by: AttributionDimension,
  touch: Touch
) {
  return queryOptions({
    queryKey: [
      "revenue",
      slug,
      siteId,
      "attribution",
      range,
      filters,
      by,
      touch,
    ] as const,
    queryFn: async () =>
      requireJson<{ currency: string; rows: AttributionRow[] }>(
        await api.workspaces[":slug"].sites[":siteId"].revenue.attribution.$get(
          {
            param: { slug, siteId },
            query: { ...rangeQuery(range, filters), by, touch },
          }
        ),
        "rows"
      ),
    staleTime: revenueStaleMs,
    placeholderData: keepPreviousData,
  })
}

export function revenueCustomersQueryOptions(slug: string, siteId: string) {
  return queryOptions({
    queryKey: ["revenue", slug, siteId, "customers"] as const,
    queryFn: async () =>
      requireJson<{ customers: RevenueCustomer[] }>(
        await api.workspaces[":slug"].sites[":siteId"].revenue.customers.$get({
          param: { slug, siteId },
        }),
        "customers"
      ),
    staleTime: revenueStaleMs,
  })
}

export function stripeStatusQueryOptions(slug: string, siteId: string) {
  return queryOptions({
    queryKey: ["stripe", slug, siteId] as const,
    queryFn: async () =>
      requireJson<{ stripe: StripeStatus }>(
        await api.workspaces[":slug"].sites[":siteId"].stripe.$get({
          param: { slug, siteId },
        }),
        "stripe"
      ),
  })
}

async function errorMessage(
  response: { json: () => Promise<unknown> },
  fallback: string
) {
  const body = (await response.json().catch(() => null)) as {
    message?: string
  } | null
  return body?.message ?? fallback
}

export async function connectStripe(
  slug: string,
  siteId: string,
  body: { apiKey: string; webhookSecret?: string }
) {
  const response = await api.workspaces[":slug"].sites[":siteId"].stripe.$post({
    param: { slug, siteId },
    json: body,
  })
  if (response.status === 403) throw new Error("You cannot connect Stripe.")
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Could not connect Stripe."))
  }
  return requireJson<{ stripe: StripeStatus }>(response, "stripe")
}

export async function stripeOauthUrl(slug: string, siteId: string) {
  const response = await api.workspaces[":slug"].sites[
    ":siteId"
  ].stripe.oauth.$get({
    param: { slug, siteId },
  })
  if (response.status === 403) throw new Error("You cannot connect Stripe.")
  if (!response.ok) throw new Error("Stripe Connect is not configured.")
  return requireJson<{ url: string }>(response, "url")
}

export async function updateStripeWebhookSecret(
  slug: string,
  siteId: string,
  webhookSecret: string | null
) {
  const response = await api.workspaces[":slug"].sites[":siteId"].stripe.$patch(
    {
      param: { slug, siteId },
      json: { webhookSecret },
    }
  )
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Could not save the secret."))
  }
  return requireJson<{ stripe: StripeStatus }>(response, "stripe")
}

export async function disconnectStripe(slug: string, siteId: string) {
  const response = await api.workspaces[":slug"].sites[
    ":siteId"
  ].stripe.$delete({
    param: { slug, siteId },
  })
  if (!response.ok) throw new Error("Could not disconnect Stripe.")
  return requireJson<{ stripe: StripeStatus }>(response, "stripe")
}

export async function syncStripeStep(
  slug: string,
  siteId: string,
  restart: boolean
) {
  const response = await api.workspaces[":slug"].sites[
    ":siteId"
  ].stripe.sync.$post({
    param: { slug, siteId },
    query: restart ? { restart: "1" } : {},
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Sync failed."))
  }
  return requireJson<{
    sync: { phase: SyncPhase; processed: number; done: boolean }
  }>(response, "sync")
}

export function formatCompactMoney(minor: number, currency: string) {
  const code = (currency || "usd").toUpperCase()
  const major = minor / 100
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      notation: Math.abs(major) >= 10_000 ? "compact" : "standard",
      maximumFractionDigits:
        Number.isInteger(major) || Math.abs(major) >= 100 ? 0 : 2,
    }).format(major)
  } catch {
    return `${Math.round(major)} ${code}`
  }
}

export function formatMoney(minor: number, currency: string) {
  const code = (currency || "usd").toUpperCase()
  const fractionDigits = minor % 100 === 0 || Math.abs(minor) >= 100_000 ? 0 : 2
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${code}`
  }
}
