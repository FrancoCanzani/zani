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
import { accountSitesQueryOptions } from "@features/sites/api"

const routeApi = getRouteApi("/_authed/businesses/")

export function BusinessesPage() {
  const { session } = routeApi.useRouteContext()
  const { data: sites } = useSuspenseQuery(accountSitesQueryOptions())

  return (
    <main className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 shrink-0 bg-background/80 px-5 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4">
          <BrandMark to="/businesses" />
          <UserMenu name={session.user.name} email={session.user.email} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-12 pb-8">
        {sites.length === 0 ? (
          <Empty className="border-none">
            <EmptyHeader>
              <EmptyTitle>No sites yet</EmptyTitle>
              <EmptyDescription>
                Add a domain to record its pageviews.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/businesses/new">Add a site</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-1 flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-4xl font-light tracking-tight">Sites</h1>
              <Button asChild className="shrink-0">
                <Link to="/businesses/new">Add a site</Link>
              </Button>
            </div>

            <ul className="flex flex-col overflow-hidden bg-secondary">
              {sites.map((site) => (
                <li
                  key={site.id}
                  className="relative border-b border-dashed transition-colors last:border-none hover:bg-muted"
                >
                  <Link
                    to="/businesses/$slug/sites/$siteId"
                    params={{ slug: site.slug, siteId: site.id }}
                    className="absolute inset-0"
                    aria-label={`Open ${site.name}`}
                  />
                  <div className="pointer-events-none relative flex items-baseline justify-between gap-4 px-3 py-3">
                    <span className="min-w-0 flex-1 truncate">{site.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {site.domain}
                      {site.revokedAt ? " revoked" : ""}
                    </span>
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
