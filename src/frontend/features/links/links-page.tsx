import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@components/ui/empty"

import { linksQueryOptions } from "@features/links/api"
import { CreateLinkDialog } from "@features/links/create-link-dialog"

const routeApi = getRouteApi("/_authed/w/$slug/")

export function LinksPage() {
  const { slug } = routeApi.useParams()
  const { data: links } = useSuspenseQuery(linksQueryOptions(slug))

  if (links.links.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>No links yet</EmptyTitle>
          <EmptyDescription>
            Create a short link for this workspace.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateLinkDialog slug={slug} />
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-end">
        <CreateLinkDialog slug={slug} />
      </div>
      <ul className="divide-y">
        {links.links.map((item) => (
          <li key={item.id}>
            <Link
              to="/w/$slug/links/$code"
              params={{ slug, code: item.code }}
              className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:text-foreground"
            >
              <span className="min-w-0 truncate">
                {item.name || item.destinationUrl}
              </span>
              <span className="shrink-0 font-mono text-sm text-muted-foreground">
                /{item.code}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
