import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import {
  workspaceInvitesQueryOptions,
  workspaceMembersQueryOptions,
  workspaceQueryOptions,
} from "@features/workspaces/api"
import { ManagePage } from "@features/workspaces/manage-page"
import { canInvite, parseWorkspaceRole } from "@features/workspaces/role"

export const Route = createFileRoute("/_authed/businesses/$slug/_shell/manage")(
  {
    pendingComponent: pendingScreen("Loading…"),
    notFoundComponent: NotFoundScreen,
    loader: async ({ context, params }) => {
      const workspaceData = await context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      })
      const role = parseWorkspaceRole(workspaceData.workspace.role)
      await Promise.all([
        context.queryClient.query({
          ...workspaceMembersQueryOptions(params.slug),
          staleTime: "static",
        }),
        role && canInvite(role)
          ? context.queryClient.query({
              ...workspaceInvitesQueryOptions(params.slug),
              staleTime: "static",
            })
          : Promise.resolve(null),
      ])
    },
    component: ManagePage,
  }
)
