import { createFileRoute } from "@tanstack/react-router"

import { pendingScreen } from "@components/pending-screen"

import { BusinessesPage } from "@features/home/businesses-page"
import {
  accountSitesQueryOptions,
  sitesSummaryQueryOptions,
} from "@features/sites/api"

export const Route = createFileRoute("/_authed/businesses/")({
  pendingComponent: pendingScreen("Loading…"),
  loader: async ({ context }) => {
    const sites = await context.queryClient.query({
      ...accountSitesQueryOptions(),
      staleTime: "static",
    })
    for (const slug of new Set(sites.map((site) => site.slug))) {
      void context.queryClient.prefetchQuery(sitesSummaryQueryOptions(slug))
    }
  },
  component: BusinessesPage,
})
