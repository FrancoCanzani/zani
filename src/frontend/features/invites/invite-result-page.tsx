import { Link, getRouteApi } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

const routeApi = getRouteApi("/_authed/invites/$token")

export function InviteResultPage() {
  const result = routeApi.useLoaderData()

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
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <Button asChild variant="outline" className="mt-8 bg-white shadow-sm">
        <Link to="/">Back home</Link>
      </Button>
    </main>
  )
}
