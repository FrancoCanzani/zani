import {
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

import type { RevenueSearch } from "./search"

export type RevenuePoint = {
  at: number
  mrr: number
  gained: number
  lost: number
}

export type RevenueOverview = {
  connected: boolean
  hasData: boolean
  currency: string
  otherCurrencies: number
  start: number
  end: number
  payingCustomers: number
  identifiedCustomers: number
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
  points: RevenuePoint[]
}

export type AttributionRow = {
  key: string
  signups: number
  customers: number
  newMrr: number
  mrr: number
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
  | "recompute"
  | "done"

export type StripeStatus =
  | { connected: false }
  | {
      connected: true
      apiKeyHint: string
      livemode: boolean
      webhookConfigured: boolean
      syncPhase: SyncPhase
      syncedAt: number | null
      syncError: string | null
      lastWebhookAt: number | null
      customers: number
    }

const revenueStaleMs = 30_000

export function revenueOverviewQueryOptions(
  slug: string,
  siteId: string,
  range: RevenueSearch["range"]
) {
  return queryOptions({
    queryKey: ["revenue", slug, siteId, "overview", range] as const,
    queryFn: async () =>
      requireJson<RevenueOverview>(
        await api.workspaces[":slug"].sites[":siteId"].revenue.$get({
          param: { slug, siteId },
          query: { range },
        }),
        "mrr"
      ),
    staleTime: revenueStaleMs,
    placeholderData: keepPreviousData,
  })
}

export function attributionQueryOptions(
  slug: string,
  siteId: string,
  search: RevenueSearch
) {
  const { range, by, touch } = search
  return queryOptions({
    queryKey: [
      "revenue",
      slug,
      siteId,
      "attribution",
      range,
      by,
      touch,
    ] as const,
    queryFn: async () =>
      requireJson<{ currency: string; rows: AttributionRow[] }>(
        await api.workspaces[":slug"].sites[":siteId"].revenue.attribution.$get(
          {
            param: { slug, siteId },
            query: { range, by, touch },
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

export async function preloadRevenue(
  queryClient: QueryClient,
  slug: string,
  siteId: string,
  search: RevenueSearch
) {
  await Promise.all([
    queryClient.query({
      ...revenueOverviewQueryOptions(slug, siteId, search.range),
      staleTime: revenueStaleMs,
    }),
    queryClient.query({
      ...attributionQueryOptions(slug, siteId, search),
      staleTime: revenueStaleMs,
    }),
    queryClient.query({
      ...revenueCustomersQueryOptions(slug, siteId),
      staleTime: revenueStaleMs,
    }),
  ])
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

export function formatMoney(minor: number, currency: string) {
  const code = (currency || "usd").toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: Math.abs(minor) >= 100_000 ? 0 : 2,
    }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${code}`
  }
}
