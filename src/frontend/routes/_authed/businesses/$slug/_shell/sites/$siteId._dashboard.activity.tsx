import { createFileRoute } from "@tanstack/react-router"

import { activityQueryOptions, statsQueryFromSearch } from "@features/sites/api"
import { ActivityPage } from "@features/sites/activity-page"
import { statsSearch } from "@features/sites/search"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/activity"
)({
  loaderDeps: ({ search }) => statsSearch(search),
  loader: async ({ context, params, deps }) => {
    const { range, filters, includeBots } = statsQueryFromSearch(deps)
    await context.queryClient.infiniteQuery(
      activityQueryOptions(
        params.slug,
        params.siteId,
        "all",
        range,
        filters,
        includeBots
      )
    )
  },
  component: ActivityPage,
})
