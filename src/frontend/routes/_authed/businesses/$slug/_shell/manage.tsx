import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { workspaceMembersQueryOptions } from "@features/workspaces/api"
import { ManagePage } from "@features/workspaces/manage-page"

export const Route = createFileRoute("/_authed/businesses/$slug/manage")({
  pendingComponent: pendingScreen("Loading…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...workspaceMembersQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: ManagePage,
})
