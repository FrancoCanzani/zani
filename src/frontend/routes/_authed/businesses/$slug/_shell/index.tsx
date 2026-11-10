import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { SitesPage } from "@features/sites/sites-page"
import { sitesQueryOptions } from "@features/sites/api"
import { workspaceQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute("/_authed/businesses/$slug/_shell/")({
  pendingComponent: pendingScreen("Loading sites…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query({
        ...sitesQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])
  },
  component: SitesPage,
})
