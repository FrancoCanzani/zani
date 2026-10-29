import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

import { workspacesQueryOptions } from "@features/workspaces/api"

export function BusinessesPage() {
  const { data } = useSuspenseQuery(workspacesQueryOptions())
  const businesses = data.workspaces

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Link to="/businesses" className="text-lg tracking-tight">
          zani
        </Link>
        <Link
          to="/account"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Account
        </Link>
      </header>

      <div className="mt-16 flex flex-1 flex-col gap-8">
        <div className="space-y-2">
          <h1 className="text-2xl tracking-tight sm:text-3xl">Businesses</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Open a business to create invoices.
          </p>
        </div>

        {businesses.length === 0 ? (
          <div className="space-y-4 rounded-lg border border-dashed border-border px-5 py-8">
            <p className="leading-relaxed text-muted-foreground">
              You don’t have a business yet. Set one up to start invoicing.
            </p>
            <Button asChild>
              <Link to="/businesses/new">Set up your business</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <ul className="divide-y border-y">
              {businesses.map((business) => (
                <li key={business.id}>
                  <Link
                    to="/businesses/$slug"
                    params={{ slug: business.slug }}
                    className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-muted-foreground"
                  >
                    <span className="truncate font-medium">{business.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      Open
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link to="/businesses/new">New business</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
