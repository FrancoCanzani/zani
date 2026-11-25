import { createFileRoute } from "@tanstack/react-router"

import {
  attributionQueryOptions,
  revenueCustomersQueryOptions,
  revenueOverviewQueryOptions,
} from "@features/revenue/api"
import { RevenuePage } from "@features/revenue/revenue-page"
import { statsQueryFromSearch } from "@features/sites/api"
import { statsSearch } from "@features/sites/search"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/revenue"
)({
  loaderDeps: ({ search }) => ({
    ...statsSearch(search),
    by: search.by,
    touch: search.touch,
  }),
  loader: async ({ context, params, deps: { by, touch, ...search } }) => {
    const { range, filters } = statsQueryFromSearch(search)
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
    void context.queryClient.prefetchQuery(
      revenueCustomersQueryOptions(params.slug, params.siteId)
    )
    await context.queryClient.query(
      revenueOverviewQueryOptions(params.slug, params.siteId, range, filters)
    )
  },
  component: RevenuePage,
})
