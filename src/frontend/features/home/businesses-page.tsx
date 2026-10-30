import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"

import { BrandMark } from "@components/brand-mark"
import { Button } from "@components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@components/ui/empty"

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

      {businesses.length === 0 ? (
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle>No businesses yet</EmptyTitle>
            <EmptyDescription>
              You don’t have a business yet. Set one up to start invoicing.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/businesses/new">Set up your business</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-16 flex flex-1 flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl tracking-tight sm:text-3xl">
                Businesses
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Open a business to create invoices.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link to="/businesses/new">New business</Link>
            </Button>
          </div>

          <ul className="flex flex-col gap-1">
            {businesses.map((business) => (
              <li
                key={business.id}
                className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60"
              >
                <Link
                  to="/businesses/$slug"
                  params={{ slug: business.slug }}
                  className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-muted-foreground"
                >
                  {business.name}
                </Link>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <Link
                    to="/businesses/$slug/manage"
                    params={{ slug: business.slug }}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Manage
                  </Link>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/businesses/$slug"
                      params={{ slug: business.slug }}
                    >
                      Open
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
