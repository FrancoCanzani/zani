import { createFileRoute } from "@tanstack/react-router"

import { pendingScreen } from "@components/pending-screen"

import {
  workspaceQueryOptions,
  workspacesQueryOptions,
} from "@features/workspaces/api"
import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { WorkspaceShell } from "@features/workspaces/workspace-shell"

export const Route = createFileRoute("/_authed/w/$slug")({
  pendingComponent: pendingScreen("Loading workspace…"),
  loader: async ({ context, params }) => {
    writeLastWorkspaceSlug(params.slug)
    await Promise.all([
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...workspacesQueryOptions(),
        staleTime: "static",
      }),
    ])
  },
  component: WorkspaceShell,
})
