import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { Suspense, startTransition, useCallback, useState } from "react"

import { Skeleton } from "@components/ui/skeleton"

import { formatMoney } from "@features/revenue/api"
import { Segmented } from "@components/segmented"
import { cn, formatRelative } from "@lib/utils"

import {
  activityQueryOptions,
  activityTypes,
  type ActivityItem,
  type ActivityType,
  type StatsFilters,
  type StatsRange,
} from "./api"
import { DimensionIcon, dimensionLabel } from "./dimension-icon"
import type { FilterKey } from "./search"

const typeLabels: Record<ActivityType, string> = {
  all: "All",
  pageviews: "Pageviews",
  signups: "Signups",
  revenue: "Revenue",
}

type RevenueItem = Extract<ActivityItem, { kind: "revenue" }>

function revenueHeadline(item: RevenueItem) {
  const amount = formatMoney(Math.abs(item.amount), item.currency)
  switch (item.movement) {
    case "new":
      return `Paid ${amount}/mo`
    case "reactivation":
      return `Came back at ${amount}/mo`
    case "expansion":
      return `Upgraded +${amount}/mo`
    case "contraction":
      return `Downgraded −${amount}/mo`
    case "churn":
      return `Churned −${amount}/mo`
    default: {
      const exhaustive: never = item.movement
      return exhaustive
    }
  }
}

function sourceName(source: string) {
  return dimensionLabel("source", source)
}

function ItemBody({ item, now }: { item: ActivityItem; now: number }) {
  switch (item.kind) {
    case "pageview":
    case "event": {
      const place = [
        item.country ? dimensionLabel("country", item.country) : "",
        item.browser,
      ].filter(Boolean)
      return (
        <>
          <span className="flex min-w-0 items-center gap-1.5">
            {item.kind === "event" ? (
              <span className="truncate font-medium">{item.name}</span>
            ) : null}
            <span className="truncate font-mono">
              {item.kind === "event" ? `on ${item.path}` : item.path}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <DimensionIcon dimension="source" value={item.source} />
            <span className="truncate">
              from {item.referrer || sourceName(item.source)}
              {place.length > 0 ? ` · ${place.join(" · ")}` : ""}
            </span>
          </span>
        </>
      )
    }
    case "signup":
      return (
        <>
          <span className="truncate font-medium">
            New signup from {sourceName(item.lastSource)}
            {item.firstSource !== item.lastSource ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                (first touch: {sourceName(item.firstSource)})
              </span>
            ) : null}
          </span>
          <span className="truncate text-muted-foreground">
            Landed on <span className="font-mono">{item.landing || "/"}</span>
            {item.country
              ? ` · ${dimensionLabel("country", item.country)}`
              : ""}
          </span>
        </>
      )
    case "revenue":
      return (
        <>
          <span
            className={`truncate font-medium ${item.movement === "churn" || item.movement === "contraction" ? "" : "text-emerald-700"}`}
          >
            {revenueHeadline(item)}
            <span className="font-normal text-muted-foreground">
              {item.firstSource !== null && item.firstSeenAt !== null
                ? ` · came from ${sourceName(item.firstSource)} ${formatRelative(item.firstSeenAt, now)}`
                : " · not identified"}
            </span>
          </span>
          <span className="truncate text-muted-foreground">
            {item.customer || "Unnamed customer"}
          </span>
        </>
      )
    default: {
      const exhaustive: never = item
      return exhaustive
    }
  }
}

function selectionFor(
  item: ActivityItem
): { key: FilterKey; value: string } | null {
  switch (item.kind) {
    case "pageview":
    case "event":
      return { key: "path", value: item.path }
    case "signup":
      return { key: "source", value: item.firstSource }
    case "revenue":
      return item.firstSource === null
        ? null
        : { key: "source", value: item.firstSource }
    default: {
      const exhaustive: never = item
      return exhaustive
    }
  }
}

function FeedList({
  slug,
  siteId,
  type,
  range,
  filters,
  includeBots,
  live,
  framed,
  now,
  onSelect,
}: {
  slug: string
  siteId: string
  type: ActivityType
  framed: boolean
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  live: boolean
  now: number
  onSelect: (key: FilterKey, value: string) => void
}) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      activityQueryOptions(slug, siteId, type, range, filters, includeBots)
    )
  const items = data.pages.flatMap((page) => page.items)
  const sentinel = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !hasNextPage || isFetchingNextPage) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) void fetchNextPage()
        },
        { rootMargin: "320px" }
      )
      observer.observe(node)
      return () => observer.disconnect()
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {live
          ? "Nothing in the last 30 minutes. Pageviews, signups, and payments show up here as they happen."
          : "Nothing in this range."}
      </p>
    )
  }

  return (
    <div
      className={cn(
        framed && "max-h-[480px] overflow-y-auto",
        framed &&
          hasNextPage &&
          "[mask-image:linear-gradient(to_bottom,black_calc(100%-6rem),transparent)]"
      )}
    >
      <ul className={cn(framed ? "divide-y divide-border/60" : "-mx-2")}>
        {items.map((item) => {
          const selection = selectionFor(item)
          return (
            <li key={`${item.kind}:${item.id}`}>
              <button
                type="button"
                disabled={selection === null}
                onClick={() =>
                  selection && onSelect(selection.key, selection.value)
                }
                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-[13px] transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <ItemBody item={item} now={now} />
                </span>
                <time
                  dateTime={new Date(item.at).toISOString()}
                  title={new Date(item.at).toLocaleString()}
                  className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums"
                >
                  {formatRelative(item.at, now)}
                </time>
              </button>
            </li>
          )
        })}
      </ul>
      {hasNextPage ? <div ref={sentinel} className="h-40" /> : null}
      {framed ? null : (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-background via-background/60 to-transparent [mask-image:linear-gradient(to_top,black_30%,transparent)] backdrop-blur-[2px]"
        />
      )}
    </div>
  )
}

function FeedFallback() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-10 rounded-md" />
      ))}
    </div>
  )
}

export function ActivityFeed(props: {
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  live: boolean
  framed: boolean
  now: number
  onSelect: (key: FilterKey, value: string) => void
}) {
  const [type, setType] = useState<ActivityType>("all")

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3",
        props.framed && "rounded-xl border border-border/70 bg-card p-4"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium tracking-tight">Activity</h2>
        <Segmented
          label="Activity type"
          options={activityTypes}
          value={type}
          labels={typeLabels}
          onChange={(next) => startTransition(() => setType(next))}
        />
      </div>
      <Suspense fallback={<FeedFallback />}>
        <FeedList {...props} type={type} />
      </Suspense>
    </section>
  )
}
