import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

import type { LineItem } from "./money"

export type EstimateSummary = {
  id: string
  publicSlug: string
  status: string
  title: string
  customerName: string
  currency: string
  depositPercent: number
  subtotalCents: number
  depositCents: number
  updatedAt: number
  createdAt: number
}

export type Estimate = {
  id: string
  workspaceId: string
  publicSlug: string
  status: string
  title: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  currency: string
  lineItems: LineItem[]
  depositPercent: number
  notes: string | null
  subtotalCents: number
  depositCents: number
  createdByUserId: string | null
  sentAt: number | null
  viewedAt: number | null
  acceptedAt: number | null
  createdAt: number
  updatedAt: number
}

export type EstimateInput = {
  title: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  currency: string
  lineItems: LineItem[]
  depositPercent: number
  notes: string | null
}

export function estimatesQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["estimates", slug] as const,
    queryFn: async () =>
      requireJson<{ estimates: EstimateSummary[] }>(
        await api.workspaces[":slug"].estimates.$get({
          param: { slug },
        }),
        "estimates"
      ),
  })
}

export function estimateQueryOptions(slug: string, estimateId: string) {
  return queryOptions({
    queryKey: ["estimate", slug, estimateId] as const,
    queryFn: async () =>
      requireJson<{ estimate: Estimate }>(
        await api.workspaces[":slug"].estimates[":estimateId"].$get({
          param: { slug, estimateId },
        }),
        "estimate"
      ),
  })
}

export async function createEstimate(slug: string) {
  const response = await api.workspaces[":slug"].estimates.$post({
    param: { slug },
  })
  if (!response.ok) {
    throw new Error("Could not create the estimate.")
  }
  return requireJson<{ estimate: Estimate }>(response, "estimate")
}

export async function updateEstimate(
  slug: string,
  estimateId: string,
  body: EstimateInput
) {
  const response = await api.workspaces[":slug"].estimates[":estimateId"].$patch(
    {
      param: { slug, estimateId },
      json: body,
    }
  )
  if (response.status === 409) {
    throw new Error("This estimate can no longer be edited.")
  }
  if (response.status === 404) {
    throw new Error("Customer not found.")
  }
  if (!response.ok) {
    throw new Error("Could not save the estimate.")
  }
  return requireJson<{ estimate: Estimate }>(response, "estimate")
}

export async function discardEstimate(slug: string, estimateId: string) {
  const response = await api.workspaces[":slug"].estimates[
    ":estimateId"
  ].$delete({
    param: { slug, estimateId },
  })
  if (response.status === 409) {
    throw new Error("Only draft estimates can be discarded.")
  }
  if (response.status === 404) {
    throw new Error("Estimate not found.")
  }
  if (!response.ok) {
    throw new Error("Could not discard the estimate.")
  }
}
