import { createFileRoute } from "@tanstack/react-router"

import { pendingScreen } from "@components/pending-screen"

import { BusinessesPage } from "@features/home/businesses-page"
import { workspacesQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute("/_authed/businesses/")({
  pendingComponent: pendingScreen("Loading…"),
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...workspacesQueryOptions(),
      staleTime: "static",
    })
  },
  component: BusinessesPage,
})
