import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"

import { BrandMark } from "@components/brand-mark"
import { Button } from "@components/ui/button"

import { UserMenu } from "@features/account/user-menu"
import { workspacesQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/")

export function BusinessesPage() {
  const { session } = routeApi.useRouteContext()
  const { data } = useSuspenseQuery(workspacesQueryOptions())
  const businesses = data.workspaces

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <BrandMark to="/businesses" />
        <UserMenu name={session.user.name} email={session.user.email} />
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
