import { createFileRoute, notFound } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { stripeStatusQueryOptions } from "@features/revenue/api"
import { sitesQueryOptions } from "@features/sites/api"
import { siteSettingsSearchSchema } from "@features/sites/settings-search"
import { SiteSettingsPage } from "@features/sites/site-settings-page"
import {
  workspaceInvitesQueryOptions,
  workspaceMembersQueryOptions,
  workspaceQueryOptions,
} from "@features/workspaces/api"
import { canInvite, parseWorkspaceRole } from "@features/workspaces/role"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId/settings"
)({
  validateSearch: siteSettingsSearchSchema,
  pendingComponent: pendingScreen("Loading settings…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    const [sitesData, workspaceData] = await Promise.all([
      context.queryClient.query({
        ...sitesQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])
    if (!sitesData.sites.some((site) => site.id === params.siteId)) {
      throw notFound()
    }
    const role = parseWorkspaceRole(workspaceData.workspace.role)
    await Promise.all([
      context.queryClient.query({
        ...stripeStatusQueryOptions(params.slug, params.siteId),
        staleTime: "static",
      }),
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
  component: SiteSettingsPage,
})
