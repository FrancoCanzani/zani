import { createFileRoute } from "@tanstack/react-router"

import {
  revenueCustomersQueryOptions,
  revenueOverviewQueryOptions,
} from "@features/revenue/api"
import { RevenuePage } from "@features/revenue/revenue-page"
import {
  previousStatsRange,
  statsQueryFromSearch,
} from "@features/sites/api"
import { statsSearch } from "@features/sites/search"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/revenue"
)({
  loaderDeps: ({ search }) => statsSearch(search),
  loader: async ({ context, params, deps }) => {
    const { range, filters } = statsQueryFromSearch(deps)
    void context.queryClient.prefetchQuery(
      revenueCustomersQueryOptions(params.slug, params.siteId)
    )
    await Promise.all([
      context.queryClient.query(
        revenueOverviewQueryOptions(
          params.slug,
          params.siteId,
          range,
          filters
        )
      ),
      context.queryClient.query(
        revenueOverviewQueryOptions(
          params.slug,
          params.siteId,
          previousStatsRange(range),
          filters
        )
      ),
    ])
  },
  component: RevenuePage,
})
