import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

export type Product = {
  id: string
  workspaceId: string
  name: string
  description: string | null
  unitAmountCents: number
  currency: string
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}

export type ProductInput = {
  name: string
  description: string | null
  unitAmountCents: number
  currency?: string
}

export function productsQueryOptions(slug: string, q = "") {
  return queryOptions({
    queryKey: ["products", slug, q] as const,
    queryFn: async () =>
      requireJson<{ products: Product[] }>(
        await api.workspaces[":slug"].products.$get({
          param: { slug },
          query: q ? { q } : {},
        }),
        "products"
      ),
  })
}

export async function createProduct(slug: string, body: ProductInput) {
  const response = await api.workspaces[":slug"].products.$post({
    param: { slug },
    json: body,
  })
  if (!response.ok) {
    throw new Error("Could not save the product.")
  }
  return requireJson<{ product: Product }>(response, "product")
}

export async function updateProduct(
  slug: string,
  productId: string,
  body: ProductInput
) {
  const response = await api.workspaces[":slug"].products[":productId"].$patch({
    param: { slug, productId },
    json: body,
  })
  if (!response.ok) {
    throw new Error("Could not update the product.")
  }
  return requireJson<{ product: Product }>(response, "product")
}

export async function archiveProduct(slug: string, productId: string) {
  const response = await api.workspaces[":slug"].products[
    ":productId"
  ].archive.$post({
    param: { slug, productId },
  })
  if (response.status === 409) {
    throw new Error("This product is already archived.")
  }
  if (!response.ok) {
    throw new Error("Could not archive the product.")
  }
  return requireJson<{ product: Product }>(response, "product")
}
