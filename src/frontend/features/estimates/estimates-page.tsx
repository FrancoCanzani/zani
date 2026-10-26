import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

import {
  createEstimate,
  estimatesQueryOptions,
} from "@features/estimates/api"
import { formatCents } from "@features/estimates/money"

const routeApi = getRouteApi("/_authed/dashboard/$slug/")

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft"
    case "sent":
      return "Sent"
    case "viewed":
      return "Viewed"
    case "accepted":
      return "Accepted"
    case "cancelled":
      return "Cancelled"
    default:
      return status
  }
}

export function EstimatesPage() {
  const { slug } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(estimatesQueryOptions(slug))

  const create = useMutation({
    mutationFn: () => createEstimate(slug),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["estimates", slug] })
      await navigate({
        to: "/dashboard/$slug/estimates/$estimateId",
        params: { slug, estimateId: body.estimate.id },
      })
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            Build one in a minute. Share and deposits come next.
          </p>
        </div>
        <Button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Creating…" : "New estimate"}
        </Button>
      </div>

      {create.error ? (
        <p className="text-sm text-destructive" role="alert">
          {create.error.message}
        </p>
      ) : null}

      {data.estimates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-10">
          <p className="max-w-sm leading-relaxed text-muted-foreground">
            No estimates yet. Create one — add the job, line items, and a
            deposit.
          </p>
        </div>
      ) : (
        <ul className="divide-y border-y">
          {data.estimates.map((item) => {
            const label =
              item.title.trim() ||
              item.customerName.trim() ||
              "Untitled estimate"
            return (
              <li key={item.id}>
                <Link
                  to="/dashboard/$slug/estimates/$estimateId"
                  params={{ slug, estimateId: item.id }}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-muted-foreground"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {statusLabel(item.status)}
                      {item.customerName.trim() && item.title.trim()
                        ? ` · ${item.customerName}`
                        : null}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums text-sm">
                    {formatCents(item.subtotalCents, item.currency)}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
