import { createFileRoute } from "@tanstack/react-router"

import {
  attributionQueryOptions,
  revenueOverviewQueryOptions,
} from "@features/revenue/api"
import { AttributionPage } from "@features/revenue/attribution-page"
import {
  siteStatsQueryOptions,
  statsQueryFromSearch,
} from "@features/sites/api"
import { statsSearch } from "@features/sites/search"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/attribution"
)({
  loaderDeps: ({ search }) => ({
    ...statsSearch(search),
    by: search.by,
    touch: search.touch,
  }),
  loader: async ({ context, params, deps: { by, touch, ...search } }) => {
    const { range, filters, includeBots } = statsQueryFromSearch(search)
    void context.queryClient.prefetchQuery(
      attributionQueryOptions(
        params.slug,
        params.siteId,
        range,
        filters,
        by,
        touch
      )
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
        siteStatsQueryOptions(
          params.slug,
          params.siteId,
          undefined,
          range,
          filters,
          includeBots
        )
      ),
    ])
  },
  component: AttributionPage,
})
