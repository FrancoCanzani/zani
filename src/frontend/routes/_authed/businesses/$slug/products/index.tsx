import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { productsQueryOptions } from "@features/products/api"
import { ProductsPage } from "@features/products/products-page"

export const Route = createFileRoute("/_authed/businesses/$slug/products/")({
  pendingComponent: pendingScreen("Loading products…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...productsQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: ProductsPage,
})
