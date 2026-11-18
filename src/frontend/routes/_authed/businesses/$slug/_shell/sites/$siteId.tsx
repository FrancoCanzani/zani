import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { preloadSiteStats, statsRange } from "@features/sites/api"
import { SitePage } from "@features/sites/site-page"
import { workspaceQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId"
)({
  pendingComponent: pendingScreen("Loading site…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    const range = statsRange()
    await Promise.all([
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
      preloadSiteStats(
        context.queryClient,
        params.slug,
        params.siteId,
        range
      ),
    ])
  },
  component: SitePage,
})
