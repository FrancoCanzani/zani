import { createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { pendingScreen } from "@components/pending-screen"

import { InviteResultPage } from "@features/invites/invite-result-page"
import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { api } from "@lib/api"

type InviteLoaderResult =
  { status: "email_mismatch" } | { status: "expired" } | { status: "failed" }

export const Route = createFileRoute("/_authed/invites/$token")({
  pendingComponent: pendingScreen("Accepting invite…"),
  loader: async ({ params }): Promise<InviteLoaderResult> => {
    const response = await api.invites[":token"].accept.$post({
      param: { token: params.token },
    })

    if (response.status === 404) {
      throw notFound()
    }

    if (response.status === 403) {
      return { status: "email_mismatch" as const }
    }

    if (response.status === 410) {
      return { status: "expired" as const }
    }

    if (!response.ok) {
      return { status: "failed" as const }
    }

    const body = await response.json()
    writeLastWorkspaceSlug(body.workspace.slug)
    throw redirect({
      to: "/businesses/$slug",
      params: { slug: body.workspace.slug },
    })
  },
  component: InviteResultPage,
})
