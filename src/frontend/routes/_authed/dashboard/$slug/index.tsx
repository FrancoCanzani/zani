import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { estimatesQueryOptions } from "@features/estimates/api"
import { EstimatesPage } from "@features/estimates/estimates-page"

export const Route = createFileRoute("/_authed/dashboard/$slug/")({
  pendingComponent: pendingScreen("Loading estimates…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...estimatesQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: EstimatesPage,
})
