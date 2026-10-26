import { createFileRoute } from "@tanstack/react-router"

import { pendingScreen } from "@components/pending-screen"

import { DashboardPage } from "@features/home/dashboard-page"
import { workspacesQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute("/_authed/dashboard/")({
  pendingComponent: pendingScreen("Loading…"),
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...workspacesQueryOptions(),
      staleTime: "static",
    })
  },
  component: DashboardPage,
})
