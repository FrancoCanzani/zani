import { useSuspenseQuery } from "@tanstack/react-query"

import { Skeleton } from "@components/ui/skeleton"

import {
  siteGoalsQueryOptions,
  type StatsFilters,
  type StatsRange,
} from "./api"
import { goalLabel } from "./search"

function rate(part: number, whole: number) {
  if (whole <= 0) return "—"
  const value = (part / whole) * 100
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
}

function goalTitle(kind: "event" | "signup" | "paid", name: string) {
  switch (kind) {
    case "signup":
      return "Signed up"
    case "paid":
      return "Paid"
    case "event":
      return name
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

export function GoalsPanel({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  activeGoal,
  onSelect,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  activeGoal: string | undefined
  onSelect: (goal: string | undefined) => void
}) {
  const { data } = useSuspenseQuery(
    siteGoalsQueryOptions(slug, siteId, range, filters, includeBots)
  )
  const max = Math.max(1, ...data.goals.map((goal) => goal.conversions))

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-card p-4">
      <div className="mb-1 space-y-0.5">
        <h2 className="text-[15px] font-medium tracking-tight">Goals</h2>
        <p className="text-xs text-muted-foreground">
          Conversion rate among {data.visitors.toLocaleString()} visitors in
          this range
        </p>
      </div>
      {data.goals.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No goals in this range
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {data.goals.map((goal) => {
            const selected = activeGoal === goal.key
            return (
              <li key={goal.key}>
                <button
                  type="button"
                  onClick={() => onSelect(selected ? undefined : goal.key)}
                  aria-pressed={selected}
                  className={`group relative flex h-[30px] w-full items-center gap-3 overflow-hidden rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? "bg-muted/70" : ""}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 rounded-md bg-foreground/[0.06]"
                    style={{ width: `${(goal.conversions / max) * 100}%` }}
                  />
                  <span className="relative min-w-0 flex-1 truncate">
                    {goalTitle(goal.kind, goal.name)}
                  </span>
                  <span className="relative w-16 text-right font-mono text-muted-foreground tabular-nums">
                    {goal.conversions.toLocaleString()}
                  </span>
                  <span className="relative w-14 text-right font-mono tabular-nums">
                    {rate(goal.conversions, data.visitors)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {activeGoal ? (
        <p className="mt-3 px-2 text-xs text-muted-foreground">
          Breakdowns show conversions for {goalLabel(activeGoal)}.
        </p>
      ) : null}
    </section>
  )
}

export function GoalsPanelFallback() {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-4">
      <Skeleton className="mb-4 h-4 w-24" />
      <div className="space-y-1.5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-[26px] rounded-md"
            style={{ width: `${88 - index * 10}%` }}
          />
        ))}
      </div>
    </section>
  )
}
