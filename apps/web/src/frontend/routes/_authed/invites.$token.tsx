import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { AppShell } from "@components/app-shell"
import { PendingScreen } from "@components/pending-screen"

import { api } from "@lib/api"
import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"

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
    <AppShell>
      <main className="max-w-md py-16">
        <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center rounded-md border bg-white px-4 py-1 text-base shadow-sm transition-all duration-300"
        >
          Back home
        </Link>
      </main>
    </AppShell>
  )
}
