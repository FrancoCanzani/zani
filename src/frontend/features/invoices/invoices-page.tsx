import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, getRouteApi, useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@components/ui/empty"

import { invoicesQueryOptions } from "@features/invoices/api"
import { formatCents, formatDisplayDate } from "@features/invoices/helpers"
import { invoiceStatusLabel } from "@features/invoices/status-label"
import { workspaceQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/")

export function InvoicesPage() {
  const { slug } = routeApi.useParams()
  const { data } = useSuspenseQuery(invoicesQueryOptions(slug))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const needsDetails = !workspaceData.workspace.detailsComplete
  const router = useRouter()

  // Warm the editor code so "Create invoice" only waits on the API.
  useEffect(() => {
    void router.loadRouteChunk(
      router.routesById["/_authed/businesses/$slug/invoices/new"]
    )
    void router.loadRouteChunk(
      router.routesById["/_authed/businesses/$slug/invoices/$invoiceId"]
    )
  }, [router])

  const createButton = (
    <Button variant="default" size="default" asChild>
      <Link
        to="/businesses/$slug/invoices/new"
        params={{ slug }}
        preload={false}
      >
        Create invoice
      </Link>
    </Button>
  )

  const detailsSticker = needsDetails ? (
    <Link
      to="/businesses/$slug/manage"
      params={{ slug }}
      className="fixed bottom-4 left-4 z-30 flex max-w-64 flex-col gap-0.5 border border-border bg-card px-3.5 py-2.5 text-xs shadow-sm transition-colors hover:bg-muted"
    >
      <span className="font-medium">Add your business details</span>
      <span className="text-muted-foreground">
        So they show on your invoices.
      </span>
    </Link>
  ) : null

  if (data.invoices.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {detailsSticker}
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Pick a customer, add items, and review before you send.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{createButton}</EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      {detailsSticker}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create, send, and track what’s outstanding.
          </p>
        </div>
        {createButton}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pr-4 pb-3 font-medium">Number</th>
              <th className="pr-4 pb-3 font-medium">Customer</th>
              <th className="pr-4 pb-3 font-medium">Status</th>
              <th className="pr-4 pb-3 font-medium">Due</th>
              <th className="pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border">
            {data.invoices.map((item) => (
              <tr key={item.id} className="group">
                <td className="py-3.5 pr-4">
                  <Link
                    to="/businesses/$slug/invoices/$invoiceId"
                    params={{ slug, invoiceId: item.id }}
                    className="font-mono text-[13px] tracking-tight transition-colors group-hover:text-muted-foreground"
                  >
                    {item.number}
                  </Link>
                </td>
                <td className="max-w-[12rem] truncate py-3.5 pr-4">
                  <Link
                    to="/businesses/$slug/invoices/$invoiceId"
                    params={{ slug, invoiceId: item.id }}
                    className="transition-colors group-hover:text-muted-foreground"
                  >
                    {item.customerName.trim() || "—"}
                  </Link>
                </td>
                <td className="py-3.5 pr-4">
                  <Badge
                    variant={item.status === "draft" ? "outline" : "secondary"}
                  >
                    {invoiceStatusLabel(item.status)}
                  </Badge>
                </td>
                <td className="py-3.5 pr-4 text-muted-foreground tabular-nums">
                  {formatDisplayDate(item.dueDate) ?? "—"}
                </td>
                <td className="py-3.5 text-right tabular-nums">
                  {formatCents(item.totalCents, item.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
