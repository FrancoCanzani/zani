import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { workspaceQueryOptions } from "@features/workspaces/api"
import { BusinessSetupPage } from "@features/workspaces/business-setup-page"

export const Route = createFileRoute("/_authed/businesses/$slug/setup")({
  pendingComponent: pendingScreen("Loading…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...workspaceQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: BusinessSetupPage,
})
