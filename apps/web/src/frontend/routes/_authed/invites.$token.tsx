import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { PendingScreen } from "@components/pending-screen"
import { Button } from "@workspace/ui/components/button"

import { api } from "@lib/api"
import { writeLastWorkspaceSlug } from "@lib/last-workspace"

type InviteLoaderResult =
  | { status: "email_mismatch" }
  | { status: "expired" }
  | { status: "failed" }

export const Route = createFileRoute("/_authed/invites/$token")({
  pendingComponent: () => <PendingScreen label="Accepting invite…" />,
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
      to: "/w/$slug",
      params: { slug: body.workspace.slug },
    })
  },
  component: InviteResultPage,
})

function InviteResultPage() {
  const result = Route.useLoaderData()

  switch (result.status) {
    case "email_mismatch":
      return (
        <InviteMessage
          title="This invite is for a different email"
          body="Sign in with the address that received the invite."
        />
      )
    case "expired":
      return (
        <InviteMessage
          title="This invite has expired"
          body="Ask a workspace owner to send a new one."
        />
      )
    case "failed":
      return (
        <InviteMessage
          title="Could not accept this invite"
          body="Try the link again, or ask for a new invite."
        />
      )
    default: {
      const exhaustive: never = result
      return exhaustive
    }
  }
}

function InviteMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-medium">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </main>
  )
}
