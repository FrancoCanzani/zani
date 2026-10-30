import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

export type Customer = {
  id: string
  workspaceId: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  taxId: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export type CustomerInput = {
  name: string
  phone: string | null
  email: string | null
  address?: string | null
  taxId?: string | null
  notes?: string | null
}

export function customersQueryOptions(slug: string, q = "") {
  return queryOptions({
    queryKey: ["customers", slug, q] as const,
    queryFn: async () =>
      requireJson<{ customers: Customer[] }>(
        await api.workspaces[":slug"].customers.$get({
          param: { slug },
          query: q ? { q } : {},
        }),
        "customers"
      ),
  })
}

export async function createCustomer(slug: string, body: CustomerInput) {
  const response = await api.workspaces[":slug"].customers.$post({
    param: { slug },
    json: body,
  })
  if (!response.ok) {
    throw new Error("Could not save the customer.")
  }
  return requireJson<{ customer: Customer }>(response, "customer")
}

export async function updateCustomer(
  slug: string,
  customerId: string,
  body: CustomerInput
) {
  const response = await api.workspaces[":slug"].customers[
    ":customerId"
  ].$patch({
    param: { slug, customerId },
    json: body,
  })
  if (response.status === 404) {
    throw new Error("Customer not found.")
  }
  if (!response.ok) {
    throw new Error("Could not update the customer.")
  }
  return requireJson<{ customer: Customer }>(response, "customer")
}
