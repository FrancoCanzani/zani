import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import {
  siteStatsQueryOptions,
  statsQueryFromSearch,
} from "@features/sites/api"
import {
  siteSearchDefaults,
  siteSearchSchema,
  statsSearch,
} from "@features/sites/search"
import { SiteLayout } from "@features/sites/site-layout"
import { workspaceQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard"
)({
  validateSearch: siteSearchSchema,
  search: { middlewares: [stripSearchParams(siteSearchDefaults)] },
  loaderDeps: ({ search }) => statsSearch(search),
  pendingComponent: pendingScreen("Loading dashboard…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params, deps }) => {
    const { range, filters, includeBots, goal } = statsQueryFromSearch(deps)
    await Promise.all([
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query(
        siteStatsQueryOptions(
          params.slug,
          params.siteId,
          undefined,
          range,
          filters,
          includeBots,
          goal
        )
      ),
    ])
  },
  component: SiteLayout,
})
