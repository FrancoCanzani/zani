import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import { EllipsisIcon } from "lucide-react"
import { useState } from "react"

import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"

import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import {
  replaceWriteKey,
  siteStatsQueryOptions,
  statsRange,
  type Breakdown,
} from "./api"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId")

const breakdowns: Breakdown[] = ["path", "referrer", "country"]

function formatStatsRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  })
  const monthDayYear = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${monthDay.format(startDate)} – ${monthDayYear.format(endDate)}`
  }
  return `${monthDayYear.format(startDate)} – ${monthDayYear.format(endDate)}`
}

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
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canReplace =
    role !== null &&
    canManageBusiness(role) &&
    totals.data.site.revokedAt === null
  const [writeKey, setWriteKey] = useState<string | null>(null)
  const replace = useMutation({
    mutationFn: () => replaceWriteKey(slug, siteId),
    onSuccess: (result) => {
      setWriteKey(result.writeKey)
    },
  })
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">
            {totals.data.site.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {totals.data.site.domain}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatStatsRange(range.start, range.end)}
          </p>
        </div>
        {canReplace ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Site actions"
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={replace.isPending}
                onClick={() => {
                  replace.reset()
                  void replace.mutate()
                }}
              >
                {replace.isPending ? "Replacing…" : "New write key"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {writeKey ? (
        <InstallSnippet
          label="Write key"
          writeKey={writeKey}
          note="Shown once. The previous key no longer works."
        />
      ) : null}

      {replace.error ? (
        <p className="text-sm text-muted-foreground">{replace.error.message}</p>
      ) : null}

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
