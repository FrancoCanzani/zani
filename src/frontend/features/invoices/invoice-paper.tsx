import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import { Textarea } from "@components/ui/textarea"

import {
  InvoiceBillTo,
  type BillToSnapshot,
} from "@features/invoices/invoice-bill-to"
import { InvoiceLines } from "@features/invoices/invoice-lines"
import {
  bpsToPercentInput,
  formatCents,
  formatTaxRate,
  invoiceTotals,
  percentToBps,
  type LineItem,
} from "@features/invoices/helpers"

const CURRENCIES = [
  "usd",
  "eur",
  "gbp",
  "cad",
  "aud",
  "nzd",
  "chf",
  "sek",
  "nok",
  "dkk",
] as const

export type InvoicePaperValues = {
  number: string
  issueDate: string
  dueDate: string
  currency: string
  notes: string
  terms: string
  taxName: string
  taxRateBps: number
  taxInclusive: boolean
  lineItems: LineItem[]
  amountPaidCents: number
  billTo: BillToSnapshot
}

type InvoicePaperProps = {
  slug: string
  businessName: string
  businessEmail?: string | null
  businessPhone?: string | null
  businessAddress?: string | null
  readOnly: boolean
  values: InvoicePaperValues
  onChange: (patch: Partial<InvoicePaperValues>) => void
  onBillToChange: (next: BillToSnapshot) => void
  onLineItemsChange: (items: LineItem[]) => void
}

export function InvoicePaper({
  slug,
  businessName,
  businessEmail,
  businessPhone,
  businessAddress,
  readOnly,
  values,
  onChange,
  onBillToChange,
  onLineItemsChange,
}: InvoicePaperProps) {
  const totals = invoiceTotals(
    values.lineItems,
    values.taxRateBps,
    values.taxInclusive,
    values.amountPaidCents
  )
  const taxLabel = values.taxName.trim() || "Tax"

  return (
    <article className="mx-auto w-full max-w-[46rem] border border-border bg-white text-foreground shadow-sm">
      <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              Invoice{" "}
              <span className="font-mono text-[0.9em] tracking-tight">
                {values.number.trim() || "—"}
              </span>
            </h1>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invoice-number">Invoice no</Label>
                <Input
                  id="invoice-number"
                  value={values.number}
                  disabled={readOnly}
                  className="font-mono"
                  onChange={(event) => onChange({ number: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoice-currency">Currency</Label>
                {readOnly ? (
                  <Input
                    id="invoice-currency"
                    value={values.currency.toUpperCase()}
                    disabled
                  />
                ) : (
                  <Select
                    value={values.currency}
                    onValueChange={(currency) => {
                      if (currency) {
                        onChange({ currency })
                      }
                    }}
                  >
                    <SelectTrigger id="invoice-currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="issue-date">Issue date</Label>
                <Input
                  id="issue-date"
                  type="date"
                  value={values.issueDate}
                  disabled={readOnly}
                  onChange={(event) =>
                    onChange({ issueDate: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due-date">Due date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={values.dueDate}
                  disabled={readOnly}
                  onChange={(event) => onChange({ dueDate: event.target.value })}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-8 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-sm font-medium">{businessName}</p>
            {businessEmail?.trim() ? (
              <p className="text-sm text-muted-foreground">{businessEmail}</p>
            ) : null}
            {businessPhone?.trim() ? (
              <p className="text-sm text-muted-foreground">{businessPhone}</p>
            ) : null}
            {businessAddress?.trim() ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {businessAddress}
              </p>
            ) : null}
          </div>
          <InvoiceBillTo
            slug={slug}
            readOnly={readOnly}
            value={values.billTo}
            onChange={onBillToChange}
          />
        </div>

        <InvoiceLines
          slug={slug}
          currency={values.currency}
          readOnly={readOnly}
          lineItems={values.lineItems}
          onChange={onLineItemsChange}
        />

        <div className="flex justify-end">
          <div className="w-full max-w-[18rem] space-y-3 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatCents(totals.subtotalCents, values.currency)}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_4.5rem] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="tax-name">Tax</Label>
                <Input
                  id="tax-name"
                  value={values.taxName}
                  disabled={readOnly}
                  placeholder="VAT"
                  onChange={(event) =>
                    onChange({ taxName: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-rate">Rate %</Label>
                <Input
                  id="tax-rate"
                  inputMode="decimal"
                  disabled={readOnly}
                  defaultValue={bpsToPercentInput(values.taxRateBps)}
                  key={values.taxRateBps}
                  className="tabular-nums"
                  onBlur={(event) =>
                    onChange({ taxRateBps: percentToBps(event.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">
                {taxLabel}
                {values.taxRateBps > 0
                  ? ` (${formatTaxRate(values.taxRateBps)}${values.taxInclusive ? " incl." : ""})`
                  : ""}
              </span>
              <span className="tabular-nums">
                {formatCents(totals.taxCents, values.currency)}
              </span>
            </div>

            {!readOnly ? (
              <label className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={values.taxInclusive}
                  className="size-3 accent-foreground"
                  onChange={(event) =>
                    onChange({ taxInclusive: event.target.checked })
                  }
                />
                Prices include tax
              </label>
            ) : null}

            <div className="flex justify-between gap-6 border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCents(totals.totalCents, values.currency)}
              </span>
            </div>

            {values.amountPaidCents > 0 ? (
              <>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="tabular-nums">
                    {formatCents(values.amountPaidCents, values.currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-6 font-medium">
                  <span>Balance</span>
                  <span className="tabular-nums">
                    {formatCents(totals.balanceCents, values.currency)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              value={values.notes}
              disabled={readOnly}
              placeholder="Anything else for this invoice"
              rows={3}
              onChange={(event) => onChange({ notes: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-terms">Terms</Label>
            <Textarea
              id="invoice-terms"
              value={values.terms}
              disabled={readOnly}
              placeholder="Payment, late fees, delivery…"
              rows={3}
              onChange={(event) => onChange({ terms: event.target.value })}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
