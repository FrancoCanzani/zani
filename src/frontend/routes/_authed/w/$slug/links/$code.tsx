import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { linkQueryOptions } from "@features/links/api"
import { LinkPage } from "@features/links/link-page"

export const Route = createFileRoute("/_authed/w/$slug/links/$code")({
  pendingComponent: pendingScreen("Loading link…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...linkQueryOptions(params.slug, params.code),
      staleTime: "static",
    })
  },
  component: LinkPage,
})
