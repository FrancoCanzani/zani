import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi, useRouter } from "@tanstack/react-router"
import { MoreHorizontalIcon } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@components/ui/empty"

import {
  deleteInvoice,
  invoiceEmailMessage,
  invoicesQueryOptions,
  remindInvoice,
  sendInvoice,
  type InvoiceSummary,
} from "@features/invoices/api"
import {
  formatCents,
  formatDisplayDate,
  formatTimestampDate,
} from "@features/invoices/helpers"
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
      <div className="flex items-center justify-between gap-4">
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
              <th className="pr-4 pb-3 text-right font-medium">Amount</th>
              <th className="pb-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border">
            {data.invoices.map((item) => (
              <tr key={item.id} className="group relative">
                <td className="py-3.5 pr-4">
                  <Link
                    to="/businesses/$slug/invoices/$invoiceId"
                    params={{ slug, invoiceId: item.id }}
                    aria-label={`View ${item.number}`}
                    className="absolute inset-0"
                  />
                  <span className="font-mono text-[13px] tracking-tight transition-colors group-hover:text-muted-foreground">
                    {item.number}
                  </span>
                </td>
                <td className="max-w-[12rem] truncate py-3.5 pr-4 transition-colors group-hover:text-muted-foreground">
                  {item.customerName.trim() || "—"}
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
                <td className="py-3.5 pr-4 text-right tabular-nums">
                  {formatCents(item.totalCents, item.currency)}
                </td>
                <td className="relative z-10 py-3.5 text-right">
                  <InvoiceActions
                    slug={slug}
                    invoice={item}
                    businessEmail={workspaceData.workspace.email}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InvoiceActions({
  slug,
  invoice,
  businessEmail,
}: {
  slug: string
  invoice: InvoiceSummary
  businessEmail: string | null
}) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [emailAction, setEmailAction] = useState<null | "send" | "remind">(null)
  const remove = useMutation({
    mutationFn: () => deleteInvoice(slug, invoice.id),
    onSuccess: async () => {
      setConfirming(false)
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      await queryClient.removeQueries({
        queryKey: ["invoice", slug, invoice.id],
      })
    },
  })
  const email = useMutation({
    mutationFn: () =>
      emailAction === "remind"
        ? remindInvoice(slug, invoice.id)
        : sendInvoice(slug, invoice.id),
    onSuccess: async (body) => {
      setEmailAction(null)
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      await queryClient.invalidateQueries({
        queryKey: ["invoice", slug, invoice.id],
      })
      toast.success(
        invoiceEmailMessage(body.delivered, invoice.customerEmail ?? "")
      )
    },
  })
  const actions = rowEmailActions(invoice)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${invoice.number}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link
              to="/businesses/$slug/invoices/$invoiceId"
              params={{ slug, invoiceId: invoice.id }}
            >
              View
            </Link>
          </DropdownMenuItem>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action}
              onSelect={() => {
                email.reset()
                setEmailAction(action)
              }}
            >
              {emailActionLabel(action)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirming(true)}
          >
            Delete invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        open={emailAction !== null}
        onOpenChange={(open) => {
          if (!email.isPending && !open) setEmailAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {emailAction === "remind"
                ? `Remind about ${invoice.number}?`
                : `Send ${invoice.number}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {emailAction
                ? emailConfirmCopy(emailAction, invoice, businessEmail)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {email.error ? (
            <p className="text-sm text-destructive" role="alert">
              {email.error.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={email.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={email.isPending || !invoice.customerEmail}
              onClick={(event) => {
                event.preventDefault()
                email.mutate()
              }}
            >
              {email.isPending
                ? "Sending…"
                : emailAction
                  ? emailActionLabel(emailAction)
                  : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!remove.isPending) setConfirming(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {invoice.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice is permanently deleted. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error ? (
            <p className="text-sm text-destructive" role="alert">
              {remove.error.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault()
                remove.mutate()
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function rowEmailActions(invoice: InvoiceSummary) {
  switch (invoice.status) {
    case "draft":
      return ["send"] as const
    case "sent":
    case "partially_paid":
      return invoice.balanceCents > 0 ? (["remind"] as const) : []
    case "paid":
    case "void":
      return []
    default: {
      const exhaustive: never = invoice.status
      return exhaustive
    }
  }
}

function emailActionLabel(action: "send" | "remind") {
  switch (action) {
    case "send":
      return "Send to customer"
    case "remind":
      return "Send reminder"
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}

function emailConfirmCopy(
  action: "send" | "remind",
  invoice: InvoiceSummary,
  businessEmail: string | null
) {
  if (!invoice.customerEmail) {
    switch (action) {
      case "send":
        return "Add a customer email on the invoice, then send."
      case "remind":
        return "Add a customer email on the invoice, then send a reminder."
      default: {
        const exhaustive: never = action
        return exhaustive
      }
    }
  }

  const replies = businessEmail
    ? ""
    : " Replies will not reach you until you add a business email."

  switch (action) {
    case "send":
      return `Email ${invoice.number} to ${invoice.customerEmail}.${replies}`
    case "remind": {
      const reminded = invoice.lastRemindedAt
        ? ` Last reminded ${formatTimestampDate(invoice.lastRemindedAt)}.`
        : ""
      return `Email a payment reminder for ${invoice.number} to ${invoice.customerEmail}.${reminded}${replies}`
    }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
