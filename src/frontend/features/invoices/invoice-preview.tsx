import type { InvoiceStatus } from "@features/invoices/api"
import {
  formatCents,
  formatDisplayDate,
  formatTaxRate,
  invoiceTotals,
  lineTotalCents,
  type LineItem,
} from "@features/invoices/helpers"

type InvoicePreviewProps = {
  businessName: string
  number: string
  status: InvoiceStatus
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  customerTaxId: string
  currency: string
  issueDate: string
  dueDate: string | null
  paymentTerms: string
  notes: string
  taxName: string
  taxRateBps: number
  taxInclusive: boolean
  lineItems: LineItem[]
  amountPaidCents: number
}

export function InvoicePreview({
  businessName,
  number,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  customerTaxId,
  currency,
  issueDate,
  dueDate,
  paymentTerms,
  notes,
  taxName,
  taxRateBps,
  taxInclusive,
  lineItems,
  amountPaidCents,
}: InvoicePreviewProps) {
  const totals = invoiceTotals(
    lineItems,
    taxRateBps,
    taxInclusive,
    amountPaidCents
  )
  const visibleLines = lineItems.filter(
    (item) =>
      item.name.trim() || item.description.trim() || item.unitAmountCents > 0
  )
  const taxLabel = taxName.trim() || "Tax"
  const contact = [customerEmail, customerPhone]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ")

  return (
    <article className="overflow-hidden rounded-2xl border border-black/5 bg-white text-neutral-950 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.35)]">
      <div className="space-y-8 p-8 sm:p-10">
        <header className="space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            Invoice{" "}
            <span className="font-mono text-[0.92em] tracking-tight">
              {number}
            </span>
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500">Serial number</dt>
              <dd className="mt-0.5 font-mono tabular-nums">{number}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Date</dt>
              <dd className="mt-0.5 tabular-nums">
                {formatDisplayDate(issueDate) ?? issueDate}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Currency</dt>
              <dd className="mt-0.5 uppercase">{currency}</dd>
            </div>
          </dl>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-neutral-100/90 px-4 py-3.5">
            <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Billed by
            </p>
            <p className="mt-2 text-sm font-medium">{businessName}</p>
          </div>
          <div className="rounded-xl bg-neutral-100/90 px-4 py-3.5">
            <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Billed to
            </p>
            {customerName.trim() ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="font-medium">{customerName}</p>
                {customerAddress.trim() ? (
                  <p className="whitespace-pre-line text-neutral-600">
                    {customerAddress}
                  </p>
                ) : null}
                {contact ? (
                  <p className="text-neutral-600">{contact}</p>
                ) : null}
                {customerTaxId.trim() ? (
                  <p className="text-neutral-500">Tax ID {customerTaxId}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-400">No customer yet</p>
            )}
          </div>
        </div>

        {(dueDate || paymentTerms.trim()) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600">
            {dueDate ? (
              <p>
                Due{" "}
                <span className="tabular-nums text-neutral-950">
                  {formatDisplayDate(dueDate)}
                </span>
              </p>
            ) : null}
            {paymentTerms.trim() ? <p>Terms · {paymentTerms}</p> : null}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_5.5rem] gap-3 bg-neutral-950 px-4 py-2.5 text-xs font-medium tracking-wide text-white uppercase">
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Price</span>
            <span className="text-right">Total</span>
          </div>
          {visibleLines.length === 0 ? (
            <p className="px-4 py-10 text-sm text-neutral-400">
              No line items yet
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {visibleLines.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_5.5rem] gap-3 px-4 py-3.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.name.trim() || "Untitled item"}
                    </p>
                    {item.description.trim() ? (
                      <p className="mt-0.5 text-[13px] leading-snug text-neutral-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-right tabular-nums text-neutral-600">
                    {item.quantity}
                  </p>
                  <p className="text-right tabular-nums text-neutral-600">
                    {formatCents(item.unitAmountCents, currency)}
                  </p>
                  <p className="text-right tabular-nums font-medium">
                    {formatCents(lineTotalCents(item), currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <dl className="w-full max-w-[15rem] space-y-2 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="tabular-nums">
                {formatCents(totals.subtotalCents, currency)}
              </dd>
            </div>
            {taxRateBps > 0 ? (
              <div className="flex justify-between gap-6">
                <dt className="text-neutral-500">
                  {taxLabel} ({formatTaxRate(taxRateBps)}
                  {taxInclusive ? " incl." : ""})
                </dt>
                <dd className="tabular-nums">
                  {formatCents(totals.taxCents, currency)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-6 border-t border-neutral-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {formatCents(totals.totalCents, currency)}
              </dd>
            </div>
            {amountPaidCents > 0 ? (
              <>
                <div className="flex justify-between gap-6">
                  <dt className="text-neutral-500">Paid</dt>
                  <dd className="tabular-nums">
                    {formatCents(amountPaidCents, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-6 font-medium">
                  <dt>Balance</dt>
                  <dd className="tabular-nums">
                    {formatCents(totals.balanceCents, currency)}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </div>

        {notes.trim() ? (
          <div className="space-y-2 border-t border-neutral-200 pt-6">
            <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Notes
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
              {notes}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
