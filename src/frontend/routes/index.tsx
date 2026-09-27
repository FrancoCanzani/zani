import { createFileRoute, redirect } from "@tanstack/react-router"

import { GuestHome } from "@features/home/guest-home"
import { workspacesQueryOptions } from "@features/workspaces/api"
import { readLastWorkspaceSlug } from "@features/workspaces/last-workspace"

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (!context.session) {
      return
    }

    const { workspaces } = await context.queryClient.query({
      ...workspacesQueryOptions(),
      staleTime: "static",
    })

    if (workspaces.length === 0) {
      throw redirect({ to: "/onboarding" })
    }

    const lastSlug = readLastWorkspaceSlug()
    const selected =
      workspaces.find((item) => item.slug === lastSlug) ?? workspaces[0]

    if (!selected) {
      throw redirect({ to: "/onboarding" })
    }

    throw redirect({
      to: "/w/$slug",
      params: { slug: selected.slug },
    })
  },
  component: GuestHome,
})
