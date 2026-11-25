import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { StepStatus } from "@features/revenue/revenue-settings"
import { formatRelative } from "@lib/utils"

import { siteSetupQueryOptions } from "./api"

const pollMs = 4_000

export function InstallStatus({
  slug,
  siteId,
  domain,
}: {
  slug: string
  siteId: string
  domain: string
}) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    ...siteSetupQueryOptions(slug, siteId),
    refetchInterval: (query) =>
      query.state.data?.setup.firstPageviewAt ? false : pollMs,
  })
  const setup = data?.setup
  const installed = Boolean(setup?.firstPageviewAt)

  useEffect(() => {
    if (!installed) return
    void queryClient.invalidateQueries({
      queryKey: ["site-stats", slug, siteId],
    })
  }, [installed, queryClient, slug, siteId])

  if (setup?.firstPageviewAt) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-600/20 bg-emerald-500/5 px-3 py-2.5 text-sm">
        <div className="min-w-0 flex-1 leading-relaxed">
          <p className="text-foreground">Script installed</p>
          <p className="text-muted-foreground">
            First pageview {formatRelative(setup.firstPageviewAt)}
            {setup.firstPageviewPath ? (
              <>
                {" "}
                on{" "}
                <span className="font-mono text-xs">
                  {setup.firstPageviewPath}
                </span>
              </>
            ) : null}
            {setup.lastPageviewAt &&
            setup.lastPageviewAt !== setup.firstPageviewAt
              ? `, latest ${formatRelative(setup.lastPageviewAt)}`
              : ""}
            .
          </p>
        </div>
        <StepStatus state="done" label="Receiving" />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1 leading-relaxed">
        <p className="text-foreground">No pageviews yet</p>
        <p className="text-muted-foreground">
          Paste the script on {domain} and load any page. This checks every few
          seconds.
        </p>
      </div>
      <StepStatus state="waiting" label="Listening" />
    </div>
  )
}
