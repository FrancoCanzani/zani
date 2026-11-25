import { createFileRoute, notFound } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { preloadRevenue } from "@features/revenue/api"
import { RevenuePage } from "@features/revenue/revenue-page"
import { revenueSearchSchema } from "@features/revenue/search"
import { sitesQueryOptions } from "@features/sites/api"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/revenue"
)({
  validateSearch: revenueSearchSchema,
  loaderDeps: ({ search }) => search,
  pendingComponent: pendingScreen("Loading revenue…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params, deps: search }) => {
    const [sitesData] = await Promise.all([
      context.queryClient.query({
        ...sitesQueryOptions(params.slug),
        staleTime: "static",
      }),
      preloadRevenue(context.queryClient, params.slug, params.siteId, search),
    ])
    if (!sitesData.sites.some((site) => site.id === params.siteId)) {
      throw notFound()
    }
  },
  component: RevenuePage,
})
