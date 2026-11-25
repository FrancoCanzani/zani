import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import {
  revenueQueryOptions,
  stripeConnectionQueryOptions,
} from "@features/revenue/api"
import { RevenuePage } from "@features/revenue/revenue-page"
import { workspaceQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/revenue"
)({
  pendingComponent: pendingScreen("Loading revenue…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...stripeConnectionQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...revenueQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])
  },
  component: RevenuePage,
})
