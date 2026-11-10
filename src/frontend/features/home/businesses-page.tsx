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
    <main className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 shrink-0 bg-background/80 px-5 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4">
          <BrandMark to="/businesses" />
          <UserMenu name={session.user.name} email={session.user.email} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-12 pb-8">
        {businesses.length === 0 ? (
          <Empty className="border-none">
            <EmptyHeader>
              <EmptyTitle>No businesses yet</EmptyTitle>
              <EmptyDescription>
                You don’t have a business yet.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/businesses/new">Set up your business</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-1 flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-4xl font-light tracking-tight">
                  Businesses
                </h1>
                <p className="text-sm text-muted-foreground">
                  Open a business to see its sites.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/businesses/new">New business</Link>
              </Button>
            </div>

            <ul className="flex flex-col overflow-hidden bg-secondary">
              {businesses.map((business) => (
                <li
                  key={business.id}
                  className="relative border-b border-dashed transition-colors last:border-none hover:bg-muted"
                >
                  <Link
                    to="/businesses/$slug"
                    params={{ slug: business.slug }}
                    className="absolute inset-0"
                    aria-label={`Open ${business.name}`}
                  />
                  <div className="pointer-events-none relative flex items-center justify-between gap-4 px-3 py-3">
                    <span className="min-w-0 flex-1 truncate">
                      {business.name}
                    </span>
                    <div className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-1">
                      <Button asChild size="xs" variant="ghost">
                        <Link
                          to="/businesses/$slug/manage"
                          params={{ slug: business.slug }}
                        >
                          Manage
                        </Link>
                      </Button>
                      <Button asChild size="xs" variant="ghost">
                        <Link
                          to="/businesses/$slug"
                          params={{ slug: business.slug }}
                        >
                          Open
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
