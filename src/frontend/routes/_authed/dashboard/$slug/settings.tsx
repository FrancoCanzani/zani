import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { workspaceMembersQueryOptions } from "@features/workspaces/api"
import { SettingsPage } from "@features/workspaces/settings-page"

export const Route = createFileRoute("/_authed/dashboard/$slug/settings")({
  pendingComponent: pendingScreen("Loading settings…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...workspaceMembersQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: SettingsPage,
})
