import { createFileRoute } from "@tanstack/react-router"

import { preloadSiteStats } from "@features/sites/api"
import { statsSearch } from "@features/sites/search"
import { SitePage } from "@features/sites/site-page"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/"
)({
  loaderDeps: ({ search }) => ({ ...statsSearch(search), live: search.live }),
  loader: async ({ context, params, deps: { live, ...search } }) => {
    if (live) return
    await preloadSiteStats(
      context.queryClient,
      params.slug,
      params.siteId,
      search
    )
  },
  component: SitePage,
})
