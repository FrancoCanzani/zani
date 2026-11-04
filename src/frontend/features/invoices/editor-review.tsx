import { ArrowLeftIcon, CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert"
import { Button } from "@components/ui/button"

import {
  formatCents,
  formatLongDate,
  invoiceTotals,
} from "@features/invoices/helpers"
import type { InvoiceDraft } from "@features/invoices/invoice-draft"

export function EditorReview({
  draft,
  businessDetailsComplete,
  sending,
  error,
  onBack,
  onSend,
}: {
  draft: InvoiceDraft
  businessDetailsComplete: boolean
  sending: boolean
  error: Error | null
  onBack: () => void
  onSend: () => void
}) {
  const totals = invoiceTotals(
    draft.lineItems,
    draft.taxRateBps,
    draft.taxInclusive,
    0
  )
  const hasCustomer = draft.billTo.name.trim().length > 0
  const hasItems = draft.lineItems.some(
    (item) => item.name.trim() || item.unitAmountCents > 0
  )

  const warnings = [
    !hasItems ? "This invoice has no items." : null,
    hasItems && totals.totalCents === 0 ? "The total is zero." : null,
    !draft.bankDetails.trim()
      ? "No bank transfer details, so the invoice doesn't say how to pay."
      : null,
    !businessDetailsComplete
      ? "Your business contact details are incomplete."
      : null,
  ].filter((warning): warning is string => warning !== null)

  const rows: [string, string][] = [
    ["Customer", hasCustomer ? draft.billTo.name : "—"],
    ["Email", draft.billTo.email.trim() || "—"],
    ["Invoice number", draft.number],
    ["Due", formatLongDate(draft.dueDate || null) ?? "On receipt"],
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeftIcon />
          Edit invoice
        </Button>
        <h2 className="text-xl font-medium tracking-tight">Review invoice</h2>
      </div>

      <div className="rounded-lg border border-border">
        <div className="space-y-1 border-b border-border p-5">
          <p className="text-sm text-muted-foreground">Amount due</p>
          <p className="text-3xl tracking-tight tabular-nums">
            {formatCents(totals.totalCents, draft.currency)}
          </p>
        </div>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 p-5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {!hasCustomer ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Add a customer before sending</AlertTitle>
        </Alert>
      ) : null}

      {warnings.length > 0 ? (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>Check before sending</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sending finalizes the invoice and marks it as sent. Email delivery
          isn’t set up yet, so share the invoice with your customer yourself.
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
        <Button
          type="button"
          variant="default"
          size="lg"
          className="w-full"
          disabled={!hasCustomer || sending}
          onClick={onSend}
        >
          {sending ? "Sending…" : "Send invoice"}
        </Button>
      </div>
    </div>
  )
}
