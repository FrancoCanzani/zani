import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

import { createInvoice, invoicesQueryOptions } from "@features/invoices/api"
import { formatCents, formatDisplayDate } from "@features/invoices/helpers"
import { invoiceStatusLabel } from "@features/invoices/status-label"

const routeApi = getRouteApi("/_authed/businesses/$slug/")

export function InvoicesPage() {
  const { slug } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(invoicesQueryOptions(slug))

  const create = useMutation({
    mutationFn: () => createInvoice(slug),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      await navigate({
        to: "/businesses/$slug/invoices/$invoiceId",
        params: { slug, invoiceId: body.invoice.id },
      })
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create, send, and track what’s outstanding.
          </p>
        </div>
        <Button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Creating…" : "New invoice"}
        </Button>
      </div>

      {create.error ? (
        <p className="text-sm text-destructive" role="alert">
          {create.error.message}
        </p>
      ) : null}

      {data.invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-10">
          <p className="max-w-sm leading-relaxed text-muted-foreground">
            No invoices yet. Create one — pick a customer, add line items from
            your catalog, and send when it’s ready.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Number</th>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Due</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
                  <td className="py-3.5 pr-4 text-muted-foreground">
                    {invoiceStatusLabel(item.status)}
                  </td>
                  <td className="py-3.5 pr-4 tabular-nums text-muted-foreground">
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
      )}
    </div>
  )
}
