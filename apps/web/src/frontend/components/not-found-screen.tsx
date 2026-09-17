import { Link } from "@tanstack/react-router"

import { AppShell } from "@components/app-shell"

export function NotFoundScreen() {
  return (
    <AppShell>
      <main className="max-w-md py-16">
        <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
          Not found
        </h1>
        <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
          That page or workspace does not exist, or you do not have access.
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
