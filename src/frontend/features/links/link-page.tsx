import { useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"

import { linkQueryOptions } from "@features/links/api"

const routeApi = getRouteApi("/_authed/w/$slug/links/$code")

export function LinkPage() {
  const { slug, code } = routeApi.useParams()
  const { data } = useSuspenseQuery(linkQueryOptions(slug, code))

  return (
    <section className="flex flex-col gap-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-normal tracking-tight">
          {data.link.name || data.link.code}
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          /{data.link.code}
        </p>
        <p className="max-w-xl truncate text-sm">{data.link.destinationUrl}</p>
      </header>
      <section className="space-y-4">
        <h2 className="text-xl font-normal text-muted-foreground">
          {data.clicks} {data.clicks === 1 ? "click" : "clicks"}
        </h2>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clicks yet.</p>
        ) : (
          <ul className="space-y-3 text-sm leading-relaxed">
            {data.recent.map((click) => (
              <li
                key={click.id}
                className="flex items-baseline justify-between gap-3"
              >
                <span>
                  {click.country || "Unknown"} · {click.device} ·{" "}
                  {click.browser}
                </span>
                <span className="text-muted-foreground">
                  {new Date(click.occurredAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
