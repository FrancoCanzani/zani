import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { MoreHorizontalIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
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
} from "@components/ui/alert-dialog"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Separator } from "@components/ui/separator"

import {
  deleteInvoice,
  downloadInvoicePdf,
  invoiceEmailMessage,
  invoiceQueryOptions,
  markInvoicePaid,
  remindInvoice,
  sendInvoice,
  updateInvoice,
  type InvoiceInput,
} from "@features/invoices/api"
import { EditorCustomerSection } from "@features/invoices/editor-customer-section"
import {
  EditorAdditionalSection,
  EditorCurrencySection,
  EditorPaymentSection,
} from "@features/invoices/editor-detail-sections"
import { EditorItemsSection } from "@features/invoices/editor-items-section"
import { EditorReview } from "@features/invoices/editor-review"
import { formatTimestampDate, invoiceTotals } from "@features/invoices/helpers"
import {
  draftFromInvoice,
  inputFromDraft,
  type InvoiceDraft,
} from "@features/invoices/invoice-draft"
import { InvoiceDocument } from "@features/invoices/invoice-document"
import { invoiceStatusLabel } from "@features/invoices/status-label"
import {
  useInvoiceSave,
  type AutosaveStatus,
} from "@features/invoices/use-invoice-save"
import { workspaceQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/invoices/$invoiceId")

export function InvoiceBuilderPage() {
  const { slug, invoiceId } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(invoiceQueryOptions(slug, invoiceId))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const workspace = workspaceData.workspace

  const [draft, setDraft] = useState<InvoiceDraft>(() =>
    draftFromInvoice(data.invoice)
  )
  const [status, setStatus] = useState(data.invoice.status)
  const [amountPaidCents, setAmountPaidCents] = useState(
    data.invoice.amountPaidCents
  )
  const [reviewing, setReviewing] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemind, setConfirmRemind] = useState(false)

  const isDraft = status === "draft"
  const readOnly = status === "paid" || status === "void"
  const canMarkPaid = status === "sent" || status === "partially_paid"
  const balanceCents = invoiceTotals(
    draft.lineItems,
    draft.taxRateBps,
    draft.taxInclusive,
    amountPaidCents
  ).balanceCents
  const canRemind = canMarkPaid && balanceCents > 0

  function patch(next: Partial<InvoiceDraft>) {
    setDraft((current) => ({ ...current, ...next }))
  }

  const saver = useInvoiceSave({
    value: inputFromDraft(draft, data.invoice.paymentTerms),
    enabled: !readOnly,
    auto: isDraft,
    persist: async (body: InvoiceInput) => {
      const saved = await updateInvoice(slug, invoiceId, body)
      queryClient.setQueryData(["invoice", slug, invoiceId], saved)
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      await saver.flush()
      return sendInvoice(slug, invoiceId)
    },
    onSuccess: async (body) => {
      setStatus(body.invoice.status)
      setReviewing(false)
      queryClient.setQueryData(["invoice", slug, invoiceId], {
        invoice: body.invoice,
      })
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      toast.success(
        invoiceEmailMessage(
          body.delivered,
          body.invoice.customerEmail ?? draft.billTo.email
        )
      )
    },
  })

  const remind = useMutation({
    mutationFn: async () => {
      await saver.flush()
      return remindInvoice(slug, invoiceId)
    },
    onSuccess: async (body) => {
      setConfirmRemind(false)
      queryClient.setQueryData(["invoice", slug, invoiceId], {
        invoice: body.invoice,
      })
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      toast.success(
        invoiceEmailMessage(
          body.delivered,
          body.invoice.customerEmail ?? draft.billTo.email
        )
      )
    },
  })

  const markPaid = useMutation({
    mutationFn: async () => {
      await saver.flush()
      return markInvoicePaid(slug, invoiceId)
    },
    onSuccess: async (body) => {
      setStatus(body.invoice.status)
      setAmountPaidCents(body.invoice.amountPaidCents)
      queryClient.setQueryData(["invoice", slug, invoiceId], body)
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
    },
  })

  const download = useMutation({
    mutationFn: async () => {
      if (!readOnly) await saver.flush()
      await downloadInvoicePdf(slug, invoiceId)
    },
  })

  const discard = useMutation({
    mutationFn: () => deleteInvoice(slug, invoiceId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["invoice", slug, invoiceId] })
      await queryClient.invalidateQueries({ queryKey: ["invoices", slug] })
      await navigate({ to: "/businesses/$slug", params: { slug } })
    },
  })

  const actionError =
    saver.error ?? download.error ?? markPaid.error ?? discard.error
  const title = isDraft ? "Edit invoice" : `Invoice ${draft.number}`

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Close" asChild>
            <Link to="/businesses/$slug" params={{ slug }}>
              <XIcon />
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5!" />
          <h1 className="truncate text-sm font-medium">{title}</h1>
          <Badge variant="secondary">{invoiceStatusLabel(status)}</Badge>
          {!readOnly ? (
            <span
              className="hidden text-xs text-muted-foreground sm:inline"
              aria-live="polite"
            >
              {saveLabel(saver.status, isDraft)}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={download.isPending}
            onClick={() => download.mutate()}
          >
            {download.isPending ? "Preparing…" : "Download PDF"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="hidden lg:inline-flex"
            onClick={() => setShowPreview((current) => !current)}
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>
          {isDraft ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="More actions"
                >
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirmDelete(true)}
                >
                  Delete draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {!isDraft && !readOnly && saver.status !== "saved" ? (
            <Button
              type="button"
              variant="outline"
              disabled={saver.status === "saving"}
              onClick={() => saver.flush().catch(() => undefined)}
            >
              {saver.status === "saving" ? "Saving…" : "Save changes"}
            </Button>
          ) : null}
          {canRemind ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                remind.reset()
                setConfirmRemind(true)
              }}
            >
              Send reminder
            </Button>
          ) : null}
          {canMarkPaid ? (
            <Button
              type="button"
              variant="default"
              disabled={markPaid.isPending}
              onClick={() => markPaid.mutate()}
            >
              {markPaid.isPending ? "Updating…" : "Mark as paid"}
            </Button>
          ) : null}
          {isDraft && !reviewing ? (
            <Button
              type="button"
              variant="default"
              onClick={() => setReviewing(true)}
            >
              Review invoice
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className={
            showPreview
              ? "min-w-0 flex-1 overflow-y-auto lg:max-w-[40rem] lg:flex-none lg:basis-[44%] lg:border-r lg:border-border"
              : "min-w-0 flex-1 overflow-y-auto"
          }
        >
          <div className="mx-auto w-full max-w-xl px-6 py-8 sm:px-8">
            {actionError ? (
              <p className="mb-6 text-sm text-destructive" role="alert">
                {actionError.message}
              </p>
            ) : null}
            {reviewing && isDraft ? (
              <EditorReview
                draft={draft}
                businessDetailsComplete={workspace.detailsComplete}
                businessEmail={workspace.email}
                sending={send.isPending}
                error={send.error}
                onBack={() => setReviewing(false)}
                onSend={() => send.mutate()}
              />
            ) : (
              <fieldset disabled={readOnly} className="min-w-0 space-y-10">
                <EditorCustomerSection
                  slug={slug}
                  value={draft.billTo}
                  onChange={(billTo) => patch({ billTo })}
                />
                <EditorCurrencySection
                  currency={draft.currency}
                  onChange={patch}
                />
                <EditorItemsSection
                  slug={slug}
                  draft={draft}
                  amountPaidCents={amountPaidCents}
                  onChange={patch}
                />
                <EditorPaymentSection draft={draft} onChange={patch} />
                <EditorAdditionalSection draft={draft} onChange={patch} />
              </fieldset>
            )}
          </div>
        </div>

        {showPreview ? (
          <aside className="hidden min-w-0 flex-1 flex-col overflow-y-auto bg-secondary lg:flex">
            <div className="flex items-center justify-between px-8 pt-6 text-sm">
              <p className="font-medium">Preview</p>
              {!workspace.detailsComplete ? (
                <Link
                  to="/businesses/$slug/manage"
                  params={{ slug }}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Complete business details
                </Link>
              ) : null}
            </div>
            <div className="mx-auto w-full max-w-[42rem] px-8 py-6">
              <InvoiceDocument
                draft={draft}
                amountPaidCents={amountPaidCents}
                business={{
                  name: workspace.name,
                  email: workspace.email,
                  phone: workspace.phone,
                  address: workspace.address,
                  taxId: workspace.taxId,
                }}
              />
            </div>
          </aside>
        ) : null}
      </div>

      <AlertDialog
        open={confirmRemind}
        onOpenChange={(open) => {
          if (!remind.isPending) setConfirmRemind(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remind about {draft.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              {remindCopy(
                draft.billTo.email.trim(),
                draft.number,
                data.invoice.lastRemindedAt,
                workspace.email
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remind.error ? (
            <p className="text-sm text-destructive" role="alert">
              {remind.error.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remind.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={remind.isPending || !draft.billTo.email.trim()}
              onClick={(event) => {
                event.preventDefault()
                remind.mutate()
              }}
            >
              {remind.isPending ? "Sending…" : "Send reminder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice is permanently deleted. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={discard.isPending}
              onClick={() => discard.mutate()}
            >
              {discard.isPending ? "Deleting…" : "Delete draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function remindCopy(
  email: string,
  number: string,
  lastRemindedAt: number | null,
  businessEmail: string | null
) {
  if (!email) {
    return "Add a customer email on the invoice, then send a reminder."
  }
  const reminded = lastRemindedAt
    ? ` Last reminded ${formatTimestampDate(lastRemindedAt)}.`
    : ""
  const replies = businessEmail
    ? ""
    : " Replies will not reach you until you add a business email."
  return `Email a payment reminder for ${number} to ${email}.${reminded}${replies}`
}

function saveLabel(status: AutosaveStatus, isDraft: boolean) {
  switch (status) {
    case "saved":
      return isDraft ? "Draft saved" : "All changes saved"
    case "unsaved":
      return isDraft ? "Saving…" : "Unsaved changes"
    case "saving":
      return "Saving…"
    case "error":
      return "Not saved"
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}
