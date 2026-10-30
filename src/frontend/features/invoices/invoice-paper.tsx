import type { ReactNode } from "react"

import { Input } from "@components/ui/input"
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
import {
  paperDateClass,
  paperInputClass,
  paperSelectTriggerClass,
} from "@features/invoices/paper-field"

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

const currencyNames = new Intl.DisplayNames(undefined, { type: "currency" })

function currencyLabel(code: string) {
  const upper = code.toUpperCase()
  return currencyNames.of(upper) ?? upper
}

export type InvoicePaperValues = {
  number: string
  issueDate: string
  dueDate: string
  currency: string
  notes: string
  bankDetails: string
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
  businessTaxId?: string | null
  readOnly: boolean
  values: InvoicePaperValues
  onChange: (patch: Partial<InvoicePaperValues>) => void
  onBillToChange: (next: BillToSnapshot) => void
  onLineItemsChange: (items: LineItem[]) => void
}

function MetaField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export function InvoicePaper({
  slug,
  businessName,
  businessEmail,
  businessPhone,
  businessAddress,
  businessTaxId,
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
      <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
        <header className="space-y-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-normal tracking-tight">Invoice</h1>
            <Input
              id="invoice-number"
              value={values.number}
              disabled={readOnly}
              aria-label="Invoice number"
              className={`${paperInputClass} w-auto min-w-[7rem] flex-1 font-mono text-2xl tracking-tight sm:max-w-[14rem]`}
              onChange={(event) => onChange({ number: event.target.value })}
            />
          </div>

          <div className="grid max-w-xl gap-4 sm:grid-cols-3">
            <MetaField label="Issue date" htmlFor="issue-date">
              <Input
                id="issue-date"
                type="date"
                value={values.issueDate}
                disabled={readOnly}
                className={`relative ${paperDateClass}`}
                onChange={(event) =>
                  onChange({ issueDate: event.target.value })
                }
              />
            </MetaField>
            <MetaField label="Due date" htmlFor="due-date">
              <Input
                id="due-date"
                type="date"
                value={values.dueDate}
                disabled={readOnly}
                className={`relative ${paperDateClass}`}
                onChange={(event) => onChange({ dueDate: event.target.value })}
              />
            </MetaField>
            <MetaField label="Currency" htmlFor="invoice-currency">
              {readOnly ? (
                <p className="py-0.5 text-sm">
                  {currencyLabel(values.currency)}
                </p>
              ) : (
                <Select
                  value={values.currency}
                  onValueChange={(currency) => {
                    if (currency) {
                      onChange({ currency })
                    }
                  }}
                >
                  <SelectTrigger
                    id="invoice-currency"
                    className={paperSelectTriggerClass}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {currencyLabel(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </MetaField>
          </div>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
          <div className="min-w-0 space-y-1">
            <div className="flex h-5 items-center">
              <p className="text-[11px] leading-5 text-muted-foreground">
                From
              </p>
            </div>
            <div className="space-y-0.5 text-sm leading-5">
              <p className="leading-5">{businessName}</p>
              {businessEmail?.trim() ? (
                <p className="text-muted-foreground">{businessEmail}</p>
              ) : null}
              {businessPhone?.trim() ? (
                <p className="text-muted-foreground">{businessPhone}</p>
              ) : null}
              {businessAddress?.trim() ? (
                <p className="whitespace-pre-line text-muted-foreground">
                  {businessAddress}
                </p>
              ) : null}
              {businessTaxId?.trim() ? (
                <p className="text-muted-foreground">Tax ID {businessTaxId}</p>
              ) : null}
            </div>
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
          <div className="w-full max-w-[16rem] space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono tabular-nums">
                {formatCents(totals.subtotalCents, values.currency)}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <div className="flex min-w-0 items-baseline gap-1 text-muted-foreground">
                {readOnly ? (
                  <span>
                    {taxLabel}
                    {values.taxRateBps > 0
                      ? ` ${formatTaxRate(values.taxRateBps)}`
                      : ""}
                    {values.taxInclusive ? " incl." : ""}
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <Input
                      id="tax-name"
                      value={values.taxName}
                      placeholder="VAT"
                      aria-label="Tax name"
                      className={`${paperInputClass} w-auto min-w-[2.5rem] max-w-[5rem] text-left text-muted-foreground`}
                      onChange={(event) =>
                        onChange({ taxName: event.target.value })
                      }
                    />
                    <Input
                      id="tax-rate"
                      inputMode="decimal"
                      defaultValue={bpsToPercentInput(values.taxRateBps)}
                      key={values.taxRateBps}
                      aria-label="Tax rate"
                      className={`${paperInputClass} w-8 text-left font-mono tabular-nums text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      onBlur={(event) =>
                        onChange({
                          taxRateBps: percentToBps(event.target.value),
                        })
                      }
                    />
                    <span>%</span>
                  </div>
                )}
              </div>
              <span className="shrink-0 font-mono tabular-nums">
                {formatCents(totals.taxCents, values.currency)}
              </span>
            </div>

            {!readOnly ? (
              <label className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
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

            <div className="flex items-baseline justify-between gap-6 border-t border-border/60 pt-2.5">
              <span>Total</span>
              <span className="font-mono tabular-nums">
                {formatCents(totals.totalCents, values.currency)}
              </span>
            </div>

            {values.amountPaidCents > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-6">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono tabular-nums">
                    {formatCents(values.amountPaidCents, values.currency)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-6">
                  <span>Balance</span>
                  <span className="font-mono tabular-nums">
                    {formatCents(totals.balanceCents, values.currency)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 border-t border-border/40 pt-8 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="invoice-notes"
              className="block text-[11px] text-muted-foreground"
            >
              Notes & terms
            </label>
            <Textarea
              id="invoice-notes"
              value={values.notes}
              disabled={readOnly}
              placeholder="Payment terms, late fees, delivery…"
              rows={3}
              onChange={(event) => onChange({ notes: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="invoice-bank"
              className="block text-[11px] text-muted-foreground"
            >
              Bank account details
            </label>
            <Textarea
              id="invoice-bank"
              value={values.bankDetails}
              disabled={readOnly}
              placeholder="Account name, IBAN, sort code…"
              rows={3}
              onChange={(event) =>
                onChange({ bankDetails: event.target.value })
              }
            />
          </div>
        </div>
      </div>
    </article>
  )
}
