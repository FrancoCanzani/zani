import { Link, createFileRoute } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"

import { authClient } from "@lib/auth-client"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  const { data: session, isPending, error } = authClient.useSession()

  return (
    <main className="flex min-h-svh flex-col items-start gap-4 p-6">
      <div className="flex w-full max-w-md min-w-0 flex-col gap-3 text-sm leading-loose">
        <h1 className="font-medium">SaaS foundation</h1>
        <SessionStatus
          isPending={isPending}
          error={error?.message ?? null}
          email={session?.user.email ?? null}
        />
      </div>
    </main>
  )
}

function SessionStatus({
  isPending,
  error,
  email,
}: {
  isPending: boolean
  error: string | null
  email: string | null
}) {
  if (isPending) {
    return <p className="text-muted-foreground">Checking session…</p>
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-destructive">Could not load your session.</p>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          Sign in with a one-time email code to continue.
        </p>
        <Button asChild className="w-fit">
          <Link to="/sign-in">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p>
        Signed in as <span className="font-medium">{email}</span>
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => {
          void authClient.signOut()
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
