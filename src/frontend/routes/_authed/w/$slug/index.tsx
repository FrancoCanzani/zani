import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { linksQueryOptions } from "@features/links/api"
import { LinksPage } from "@features/links/links-page"

export const Route = createFileRoute("/_authed/w/$slug/")({
  pendingComponent: pendingScreen("Loading links…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...linksQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: LinksPage,
})
