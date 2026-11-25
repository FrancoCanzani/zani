import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import {
  CircleDollarSignIcon,
  EyeIcon,
  UserPlusIcon,
  ZapIcon,
} from "lucide-react"
import { Suspense, startTransition, useState } from "react"

import { Button } from "@components/ui/button"
import { Skeleton } from "@components/ui/skeleton"

import { formatMoney } from "@features/revenue/api"
import { Segmented } from "@components/segmented"
import { formatRelative } from "@lib/utils"

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

function ItemIcon({ item }: { item: ActivityItem }) {
  const className = "size-3.5"
  switch (item.kind) {
    case "pageview":
      return <EyeIcon aria-hidden className={className} />
    case "event":
      return <ZapIcon aria-hidden className={className} />
    case "signup":
      return <UserPlusIcon aria-hidden className={className} />
    case "revenue":
      return <CircleDollarSignIcon aria-hidden className={className} />
    default: {
      const exhaustive: never = item
      return exhaustive
    }
  }
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

function iconTone(item: ActivityItem) {
  switch (item.kind) {
    case "revenue":
      return "bg-emerald-500/10 text-emerald-700"
    case "signup":
      return "bg-sky-500/10 text-sky-700"
    case "pageview":
    case "event":
      return "bg-muted text-muted-foreground"
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
  now,
  onSelect,
}: {
  slug: string
  siteId: string
  type: ActivityType
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
    <div className="max-h-[480px] overflow-y-auto">
      <ul className="divide-y divide-border/60">
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
                className="flex w-full items-center gap-3 px-1 py-2 text-left text-[13px] transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${iconTone(item)}`}
                >
                  <ItemIcon item={item} />
                </span>
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
      {hasNextPage ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="mt-2 w-full text-muted-foreground"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
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
  now: number
  onSelect: (key: FilterKey, value: string) => void
}) {
  const [type, setType] = useState<ActivityType>("all")

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
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
