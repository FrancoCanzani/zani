import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"

import {
  discardInvoice,
  invoiceQueryOptions,
  markInvoicePaid,
  sendInvoice,
  updateInvoice,
  type InvoiceInput,
} from "@features/invoices/api"
import type { BillToSnapshot } from "@features/invoices/invoice-bill-to"
import {
  formatCents,
  invoiceTotals,
  type LineItem,
} from "@features/invoices/helpers"
import { InvoicePaper } from "@features/invoices/invoice-paper"
import { invoiceStatusLabel } from "@features/invoices/status-label"
import { workspaceQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/invoices/$invoiceId")

export function InvoiceBuilderPage() {
  const { slug, invoiceId } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(invoiceQueryOptions(slug, invoiceId))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))

  const [number, setNumber] = useState(data.invoice.number)
  const [customerId, setCustomerId] = useState(data.invoice.customerId)
  const [customerName, setCustomerName] = useState(data.invoice.customerName)
  const [customerPhone, setCustomerPhone] = useState(
    data.invoice.customerPhone ?? ""
  )
  const [customerEmail, setCustomerEmail] = useState(
    data.invoice.customerEmail ?? ""
  )
  const [customerAddress, setCustomerAddress] = useState(
    data.invoice.customerAddress ?? ""
  )
  const [customerTaxId, setCustomerTaxId] = useState(
    data.invoice.customerTaxId ?? ""
  )
  const [currency, setCurrency] = useState(data.invoice.currency)
  const [issueDate, setIssueDate] = useState(data.invoice.issueDate)
  const [dueDate, setDueDate] = useState(data.invoice.dueDate ?? "")
  const [notes, setNotes] = useState(data.invoice.notes ?? "")
  const [terms, setTerms] = useState(data.invoice.terms ?? "")
  const [taxName, setTaxName] = useState(data.invoice.taxName ?? "")
  const [taxRateBps, setTaxRateBps] = useState(data.invoice.taxRateBps)
  const [taxInclusive, setTaxInclusive] = useState(data.invoice.taxInclusive)
  const [lineItems, setLineItems] = useState<LineItem[]>(
    data.invoice.lineItems
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [status, setStatus] = useState(data.invoice.status)
  const [amountPaidCents, setAmountPaidCents] = useState(
    data.invoice.amountPaidCents
  )

  const readOnly = status === "paid" || status === "void"
  const isDraft = status === "draft"
  const canMarkPaid = status === "sent" || status === "partially_paid"
  const totals = invoiceTotals(
    lineItems,
    taxRateBps,
    taxInclusive,
    amountPaidCents
  )

  const save = useMutation({
    mutationFn: (body: InvoiceInput) => updateInvoice(slug, invoiceId, body),
    onSuccess: async (body) => {
      setNumber(body.invoice.number)
      setCustomerId(body.invoice.customerId)
      setStatus(body.invoice.status)
      setAmountPaidCents(body.invoice.amountPaidCents)
      queryClient.setQueryData(["invoice", slug, invoiceId], body)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices", slug] }),
        queryClient.invalidateQueries({ queryKey: ["customers", slug] }),
      ])
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1500)
    },
  })

  const discard = useMutation({
    mutationFn: () => discardInvoice(slug, invoiceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      queryClient.removeQueries({ queryKey: ["invoice", slug, invoiceId] })
      await navigate({ to: "/businesses/$slug", params: { slug } })
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      await updateInvoice(slug, invoiceId, buildBody())
      return sendInvoice(slug, invoiceId)
    },
    onSuccess: async (body) => {
      setStatus(body.invoice.status)
      queryClient.setQueryData(["invoice", slug, invoiceId], body)
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
    },
  })

  const markPaid = useMutation({
    mutationFn: () => markInvoicePaid(slug, invoiceId),
    onSuccess: async (body) => {
      setStatus(body.invoice.status)
      setAmountPaidCents(body.invoice.amountPaidCents)
      queryClient.setQueryData(["invoice", slug, invoiceId], body)
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
    },
  })

  function buildBody(): InvoiceInput {
    const lines =
      lineItems.length > 0
        ? lineItems
        : []
    return {
      number: number.trim(),
      customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      customerAddress: customerAddress.trim() || null,
      customerTaxId: customerTaxId.trim() || null,
      currency,
      issueDate,
      dueDate: dueDate || null,
      paymentTerms: data.invoice.paymentTerms,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      taxName: taxName.trim() || null,
      taxRateBps,
      taxInclusive,
      lineItems: lines
        .filter(
          (item) =>
            item.name.trim() ||
            item.description.trim() ||
            item.unitAmountCents > 0
        )
        .map((item) => ({
          ...item,
          name: item.name.trim(),
          description: item.description.trim(),
          quantity: item.quantity > 0 ? item.quantity : 1,
          unitAmountCents: Math.max(0, Math.round(item.unitAmountCents)),
        })),
    }
  }

  const busy =
    save.isPending ||
    discard.isPending ||
    send.isPending ||
    markPaid.isPending
  const actionError =
    save.error ?? discard.error ?? send.error ?? markPaid.error

  function onBillToChange(next: BillToSnapshot) {
    setCustomerId(next.customerId)
    setCustomerName(next.customerName)
    setCustomerPhone(next.customerPhone)
    setCustomerEmail(next.customerEmail)
    setCustomerAddress(next.customerAddress)
    setCustomerTaxId(next.customerTaxId)
  }

  const needsDetails = !workspaceData.workspace.detailsComplete

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {actionError ? (
        <p className="shrink-0 pb-3 text-sm text-destructive" role="alert">
          {actionError.message}
        </p>
      ) : null}

      {needsDetails ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Add your business details so the From block is complete.
          </p>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/businesses/$slug/manage" params={{ slug }}>
              Complete details
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-100/90 px-0 pb-28 pt-2 sm:px-2">
        <InvoicePaper
          slug={slug}
          businessName={workspaceData.workspace.name}
          businessEmail={workspaceData.workspace.email}
          businessPhone={workspaceData.workspace.phone}
          businessAddress={workspaceData.workspace.address}
          readOnly={readOnly}
          values={{
            number,
            issueDate,
            dueDate,
            currency,
            notes,
            terms,
            taxName,
            taxRateBps,
            taxInclusive,
            lineItems,
            amountPaidCents,
            billTo: {
              customerId,
              customerName,
              customerPhone,
              customerEmail,
              customerAddress,
              customerTaxId,
            },
          }}
          onChange={(patch) => {
            if (patch.number !== undefined) setNumber(patch.number)
            if (patch.issueDate !== undefined) setIssueDate(patch.issueDate)
            if (patch.dueDate !== undefined) setDueDate(patch.dueDate)
            if (patch.currency !== undefined) setCurrency(patch.currency)
            if (patch.notes !== undefined) setNotes(patch.notes)
            if (patch.terms !== undefined) setTerms(patch.terms)
            if (patch.taxName !== undefined) setTaxName(patch.taxName)
            if (patch.taxRateBps !== undefined) setTaxRateBps(patch.taxRateBps)
            if (patch.taxInclusive !== undefined)
              setTaxInclusive(patch.taxInclusive)
          }}
          onBillToChange={onBillToChange}
          onLineItemsChange={setLineItems}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tabular-nums">
              {formatCents(totals.totalCents, currency)}
              <span className="ml-2 font-normal text-muted-foreground">
                {invoiceStatusLabel(status)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isDraft ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                  >
                    Discard
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the invoice. This cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep editing</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={discard.isPending}
                      onClick={() => discard.mutate()}
                    >
                      {discard.isPending ? "Discarding…" : "Discard"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {!readOnly ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => save.mutate(buildBody())}
              >
                {save.isPending ? "Saving…" : savedFlash ? "Saved" : "Save"}
              </Button>
            ) : null}
            {isDraft ? (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => send.mutate()}
              >
                {send.isPending ? "Sending…" : "Send"}
              </Button>
            ) : null}
            {canMarkPaid ? (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => markPaid.mutate()}
              >
                {markPaid.isPending ? "Updating…" : "Mark paid"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
