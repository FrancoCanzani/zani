import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { customersQueryOptions } from "@features/customers/api"
import { estimateQueryOptions } from "@features/estimates/api"
import { EstimateBuilderPage } from "@features/estimates/estimate-builder-page"

export const Route = createFileRoute(
  "/_authed/dashboard/$slug/estimates/$estimateId"
)({
  pendingComponent: pendingScreen("Loading estimate…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query({
        ...estimateQueryOptions(params.slug, params.estimateId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...customersQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])
  },
  component: EstimateBuilderPage,
})
