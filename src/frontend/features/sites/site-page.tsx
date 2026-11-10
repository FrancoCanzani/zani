import { useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"

import { siteStatsQueryOptions, statsRange, type Breakdown } from "./api"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId")

const breakdowns: Breakdown[] = ["path", "referrer", "country"]

export function SitePage() {
  const { slug, siteId } = routeApi.useParams()
  const range = statsRange()
  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range)
  )
  const path = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "path", range)
  )
  const referrer = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "referrer", range)
  )
  const country = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "country", range)
  )
  const tables = { path, referrer, country }

  return (
    <div className="flex flex-col gap-10">
      <div className="space-y-1">
        <h1 className="text-4xl font-light tracking-tight">
          {totals.data.site.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {totals.data.site.domain}
        </p>
        <p className="text-sm text-muted-foreground">
          {range.start} – {range.end}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Views</dt>
          <dd>{totals.data.views}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Visitors</dt>
          <dd>{totals.data.visitors}</dd>
        </div>
      </dl>

      {breakdowns.map((breakdown) => (
        <section key={breakdown} className="space-y-2">
          <h2 className="text-sm text-muted-foreground">{breakdown}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-normal">value</th>
                <th className="py-1 font-normal">views</th>
                <th className="py-1 font-normal">visitors</th>
              </tr>
            </thead>
            <tbody>
              {tables[breakdown].data.points.map((point) => (
                <tr key={point.series} className="border-t">
                  <td className="py-1">{point.series || "(none)"}</td>
                  <td className="py-1">{point.views}</td>
                  <td className="py-1">{point.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tables[breakdown].data.truncated ? (
            <p className="text-sm text-muted-foreground">Truncated.</p>
          ) : null}
        </section>
      ))}
    </div>
  )
}
