import { createFileRoute } from "@tanstack/react-router"

import { revenueOverviewQueryOptions } from "@features/revenue/api"
import {
  preloadSiteStats,
  previousStatsRange,
  siteSetupQueryOptions,
  statsQueryFromSearch,
} from "@features/sites/api"
import { statsSearch } from "@features/sites/search"
import { SitePage } from "@features/sites/site-page"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/"
)({
  loaderDeps: ({ search }) => ({ ...statsSearch(search), live: search.live }),
  loader: async ({ context, params, deps: { live, ...search } }) => {
    if (live) return
    const { range, filters } = statsQueryFromSearch(search)
    void context.queryClient.prefetchQuery(
      siteSetupQueryOptions(params.slug, params.siteId)
    )
    await Promise.all([
      preloadSiteStats(context.queryClient, params.slug, params.siteId, search),
      context.queryClient.query(
        revenueOverviewQueryOptions(params.slug, params.siteId, range, filters)
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
  component: SitePage,
})
