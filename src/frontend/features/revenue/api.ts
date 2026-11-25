import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

export type StripeConnection = {
  id: string
  stripeAccountId: string
  livemode: boolean
  createdAt: number
  updatedAt: number
  webhookPath: string
}

export type RevenueSourceRow = {
  source: string
  signups: number
  customers: number
  mrrCents: number
}

export type RevenueStats = {
  connected: boolean
  mrrCents: number
  customers: number
  matchedCustomers: number
  matchedMrrCents: number
  signups: number
  arpuCents: number
  churnRate: number
  currency: string
  sources: RevenueSourceRow[]
}

export function stripeConnectionQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["stripe", slug] as const,
    queryFn: async () =>
      requireJson<{
        connected: boolean
        connection: StripeConnection | null
      }>(
        await api.workspaces[":slug"].stripe.$get({
          param: { slug },
        }),
        "connected"
      ),
  })
}

export function revenueQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["revenue", slug] as const,
    queryFn: async () =>
      requireJson<RevenueStats>(
        await api.workspaces[":slug"].revenue.$get({
          param: { slug },
        }),
        "mrrCents"
      ),
  })
}

export async function connectStripe(
  slug: string,
  body: { secretKey: string; webhookSecret: string }
) {
  const response = await api.workspaces[":slug"].stripe.$post({
    param: { slug },
    json: body,
  })
  if (response.status === 403) {
    throw new Error("You cannot connect Stripe.")
  }
  if (response.status === 400) {
    throw new Error("Stripe rejected that key.")
  }
  if (!response.ok) {
    throw new Error("Could not connect Stripe.")
  }
  return requireJson<{
    connection: StripeConnection
    synced: number
  }>(response, "connection")
}

export async function disconnectStripe(slug: string) {
  const response = await api.workspaces[":slug"].stripe.$delete({
    param: { slug },
  })
  if (response.status === 403) {
    throw new Error("You cannot disconnect Stripe.")
  }
  if (!response.ok) {
    throw new Error("Could not disconnect Stripe.")
  }
}

export async function syncStripe(slug: string) {
  const response = await api.workspaces[":slug"].stripe.sync.$post({
    param: { slug },
  })
  if (response.status === 404) {
    throw new Error("Connect Stripe first.")
  }
  if (!response.ok) {
    throw new Error("Could not sync Stripe.")
  }
  return requireJson<{ synced: number }>(response, "synced")
}

export async function simulateStripeRevenue(slug: string) {
  const response = await api.workspaces[":slug"].stripe.simulate.$post({
    param: { slug },
  })
  if (response.status === 404) {
    throw new Error("Simulate is only available in development.")
  }
  if (response.status === 400) {
    throw new Error("Add a site before simulating revenue.")
  }
  if (!response.ok) {
    throw new Error("Could not simulate revenue.")
  }
  return requireJson<{ customers: number; signups: number }>(
    response,
    "customers"
  )
}

export function formatMoney(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(0)}`
  }
}
