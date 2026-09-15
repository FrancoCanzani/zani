import { Link, createFileRoute, redirect } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"

import { readLastWorkspaceSlug } from "@lib/last-workspace"
import { workspacesQueryOptions } from "@lib/queries"

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

function GuestHome() {
  return (
    <main className="flex min-h-svh flex-col items-start gap-4 p-6">
      <div className="flex w-full max-w-md min-w-0 flex-col gap-3 text-sm leading-loose">
        <h1 className="font-medium">SaaS foundation</h1>
        <p className="text-muted-foreground">
          Sign in with a one-time email code, then create a workspace.
        </p>
        <Button asChild className="w-fit">
          <Link to="/sign-in">Sign in</Link>
        </Button>
      </div>
    </main>
  )
}
