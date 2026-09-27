import { Link } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

export function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
        Not found
      </h1>
      <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
        That page or workspace does not exist, or you do not have access.
      </p>
      <Button asChild variant="outline" className="mt-8 bg-white shadow-sm">
        <Link to="/">Back home</Link>
      </Button>
    </main>
  )
}
