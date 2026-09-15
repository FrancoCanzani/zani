import { Link } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"

export function NotFoundScreen() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-medium">Not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That page or workspace does not exist, or you do not have access.
      </p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </main>
  )
}
