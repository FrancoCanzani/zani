import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Suspense, useState } from "react"
import { toast } from "sonner"

import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Field, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import {
  createFunnel,
  deleteFunnel,
  funnelResultsQueryOptions,
  funnelsQueryOptions,
  updateFunnel,
  type Funnel,
  type FunnelStep,
  type StatsFilters,
  type StatsRange,
} from "./api"

const stepTypes = ["page", "event", "signup", "paid"] as const
type StepType = (typeof stepTypes)[number]

const stepTypeLabels: Record<StepType, string> = {
  page: "Page",
  event: "Event",
  signup: "Signed up",
  paid: "Paid",
}

function stepLabel(step: FunnelStep) {
  switch (step.type) {
    case "page":
      return step.path
    case "event":
      return step.name
    case "signup":
      return "Signed up"
    case "paid":
      return "Paid"
    default: {
      const exhaustive: never = step
      return exhaustive
    }
  }
}

function blankStep(type: StepType = "page"): FunnelStep {
  switch (type) {
    case "page":
      return { type: "page", path: "/" }
    case "event":
      return { type: "event", name: "" }
    case "signup":
      return { type: "signup" }
    case "paid":
      return { type: "paid" }
    default: {
      const exhaustive: never = type
      return exhaustive
    }
  }
}

function rate(part: number, whole: number) {
  if (whole <= 0) return "—"
  const value = (part / whole) * 100
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
}

export function FunnelsPanel({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  activeFunnel,
  onSelect,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  activeFunnel: string | undefined
  onSelect: (funnelId: string | undefined) => void
}) {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(funnelsQueryOptions(slug, siteId))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role ? canManageBusiness(role) : false
  const selected =
    data.funnels.find((funnel) => funnel.id === activeFunnel) ??
    data.funnels[0]
  const [editor, setEditor] = useState<Funnel | "new" | null>(null)

  const remove = useMutation({
    mutationFn: (funnelId: string) => deleteFunnel(slug, siteId, funnelId),
    onSuccess: async (_, funnelId) => {
      await queryClient.invalidateQueries({ queryKey: ["funnels", slug, siteId] })
      if (activeFunnel === funnelId) onSelect(undefined)
      toast.success("Funnel deleted.")
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-[15px] font-medium tracking-tight">Funnels</h2>
          <p className="text-xs text-muted-foreground">
            Ordered steps visitors complete in sequence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.funnels.length > 0 ? (
            <Select
              value={selected?.id}
              onValueChange={(value) => onSelect(value)}
            >
              <SelectTrigger size="xs" className="min-w-36">
                <SelectValue placeholder="Select funnel" />
              </SelectTrigger>
              <SelectContent>
                {data.funnels.map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setEditor("new")}
            >
              <PlusIcon data-icon="inline-start" />
              New
            </Button>
          ) : null}
        </div>
      </div>

      {selected ? (
        <>
          <Suspense
            fallback={
              <div className="space-y-1.5">
                {Array.from({ length: selected.steps.length }, (_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[30px] rounded-md"
                    style={{ width: `${92 - index * 10}%` }}
                  />
                ))}
              </div>
            }
          >
            <FunnelResults
              key={selected.id}
              slug={slug}
              siteId={siteId}
              funnel={selected}
              range={range}
              filters={filters}
              includeBots={includeBots}
            />
          </Suspense>
          {canManage ? (
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setEditor(selected)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete “${selected.name}”?`)) {
                    void remove.mutate(selected.id)
                  }
                }}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-8 text-center text-xs text-muted-foreground">
          {canManage
            ? "Create a funnel to measure drop-off between steps."
            : "No funnels yet."}
        </p>
      )}

      {editor !== null ? (
        <FunnelEditor
          slug={slug}
          siteId={siteId}
          funnel={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={(funnel) => {
            setEditor(null)
            onSelect(funnel.id)
          }}
        />
      ) : null}
    </section>
  )
}

function FunnelResults({
  slug,
  siteId,
  funnel,
  range,
  filters,
  includeBots,
}: {
  slug: string
  siteId: string
  funnel: Funnel
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
}) {
  const { data } = useSuspenseQuery(
    funnelResultsQueryOptions(
      slug,
      siteId,
      funnel.id,
      range,
      filters,
      includeBots
    )
  )
  const first = data.steps[0]?.visitors ?? 0
  const max = Math.max(1, first)

  return (
    <ul className="space-y-1">
      {funnel.steps.map((step, index) => {
        const visitors = data.steps[index]?.visitors ?? 0
        const previous = data.steps[index - 1]?.visitors ?? first
        return (
          <li
            key={`${step.type}-${index}`}
            className="relative flex min-h-[34px] items-center gap-3 overflow-hidden rounded-md px-2 text-[13px]"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-md bg-foreground/[0.06]"
              style={{ width: `${(visitors / max) * 100}%` }}
            />
            <span className="relative w-5 font-mono text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <span className="relative min-w-0 flex-1 truncate font-mono">
              {stepLabel(step)}
            </span>
            <span className="relative w-16 text-right font-mono text-muted-foreground tabular-nums">
              {visitors.toLocaleString()}
            </span>
            <span className="relative w-14 text-right font-mono tabular-nums">
              {index === 0 ? "100%" : rate(visitors, previous)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function FunnelEditor({
  slug,
  siteId,
  funnel,
  onClose,
  onSaved,
}: {
  slug: string
  siteId: string
  funnel: Funnel | null
  onClose: () => void
  onSaved: (funnel: Funnel) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(funnel?.name ?? "")
  const [steps, setSteps] = useState<FunnelStep[]>(
    funnel?.steps ?? [blankStep("page"), blankStep("signup")]
  )

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), steps }
      if (funnel) return updateFunnel(slug, siteId, funnel.id, body)
      return createFunnel(slug, siteId, body)
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["funnels", slug, siteId] })
      toast.success(funnel ? "Funnel saved." : "Funnel created.")
      onSaved(result.funnel)
    },
    onError: (error) => toast.error(error.message),
  })

  function updateStep(index: number, next: FunnelStep) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? next : step))
    )
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{funnel ? "Edit funnel" : "New funnel"}</DialogTitle>
          <DialogDescription>
            Steps must be completed in order. Use a trailing * on paths for a
            prefix match.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="funnel-name">Name</FieldLabel>
            <Input
              id="funnel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Signup → paid"
            />
          </Field>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Steps</p>
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <Select
                  value={step.type}
                  onValueChange={(value) =>
                    updateStep(index, blankStep(value as StepType))
                  }
                >
                  <SelectTrigger size="sm" className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stepTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {stepTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {step.type === "page" ? (
                  <Input
                    value={step.path}
                    onChange={(event) =>
                      updateStep(index, {
                        type: "page",
                        path: event.target.value,
                      })
                    }
                    placeholder="/pricing"
                    className="font-mono"
                  />
                ) : step.type === "event" ? (
                  <Input
                    value={step.name}
                    onChange={(event) =>
                      updateStep(index, {
                        type: "event",
                        name: event.target.value.toLowerCase(),
                      })
                    }
                    placeholder="checkout_started"
                    className="font-mono"
                  />
                ) : (
                  <div className="flex h-8 flex-1 items-center text-sm text-muted-foreground">
                    {stepTypeLabels[step.type]}
                  </div>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={steps.length <= 2}
                  aria-label="Remove step"
                  onClick={() =>
                    setSteps((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={steps.length >= 8}
              onClick={() => setSteps((current) => [...current, blankStep()])}
            >
              Add step
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              save.isPending ||
              name.trim().length === 0 ||
              steps.length < 2 ||
              steps.some(
                (step) =>
                  (step.type === "page" && !step.path.startsWith("/")) ||
                  (step.type === "event" &&
                    !/^[a-z0-9_-]{1,32}$/.test(step.name))
              )
            }
            onClick={() => void save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FunnelsPanelFallback() {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-4">
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="space-y-1.5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-[26px] rounded-md"
            style={{ width: `${90 - index * 12}%` }}
          />
        ))}
      </div>
    </section>
  )
}
