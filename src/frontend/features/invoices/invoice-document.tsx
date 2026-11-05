import {
  formatCents,
  formatLongDate,
  formatQuantity,
  formatTaxRate,
  invoiceTotals,
  lineHasContent,
  lineTotalCents,
} from "@features/invoices/helpers"
import type { InvoiceDraft } from "@features/invoices/invoice-draft"

export type DocumentBusiness = {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
}

function ContactBlock({
  heading,
  lines,
  placeholder,
}: {
  heading: string
  lines: (string | null | undefined)[]
  placeholder?: string
}) {
  const visible = lines.filter((line): line is string => Boolean(line?.trim()))
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="font-medium">{heading}</p>
      {visible.length > 0 ? (
        visible.map((line, index) => (
          <p key={index} className="whitespace-pre-line">
            {line}
          </p>
        ))
      ) : placeholder ? (
        <p className="text-neutral-400">{placeholder}</p>
      ) : null}
    </div>
  )
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`flex justify-between gap-6 border-b border-neutral-200 py-1.5 ${strong ? "font-semibold" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

export function InvoiceDocument({
  draft,
  business,
  amountPaidCents,
}: {
  draft: InvoiceDraft
  business: DocumentBusiness
  amountPaidCents: number
}) {
  const items = draft.lineItems.filter(lineHasContent)
  const totals = invoiceTotals(
    items,
    draft.taxRateBps,
    draft.taxInclusive,
    amountPaidCents
  )
  const money = (cents: number) => formatCents(cents, draft.currency)
  const dueLong = formatLongDate(draft.dueDate || null)
  const taxLabel = `${draft.taxName.trim() || "Tax"} (${formatTaxRate(draft.taxRateBps)}${draft.taxInclusive ? " included" : ""})`

  return (
    <article className="flex aspect-[8.5/11] w-full flex-col bg-white px-[7%] py-[8%] text-[11px] leading-[1.45] text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]">
      <header className="space-y-5">
        <h1 className="text-[22px] font-semibold tracking-tight">Invoice</h1>
        <dl className="grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-0.5">
          <dt className="text-neutral-500">Invoice number</dt>
          <dd className="font-medium">{draft.number || "—"}</dd>
          <dt className="text-neutral-500">Date of issue</dt>
          <dd>{formatLongDate(draft.issueDate) ?? "—"}</dd>
          <dt className="text-neutral-500">Date due</dt>
          <dd>{dueLong ?? "—"}</dd>
        </dl>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-8">
        <ContactBlock
          heading={business.name}
          lines={[
            business.address,
            business.phone,
            business.email,
            business.taxId ? `Tax ID ${business.taxId}` : null,
          ]}
        />
        <ContactBlock
          heading="Bill to"
          lines={[
            draft.billTo.name,
            draft.billTo.address,
            draft.billTo.phone,
            draft.billTo.email,
            draft.billTo.taxId ? `Tax ID ${draft.billTo.taxId}` : null,
          ]}
          placeholder="No customer selected"
        />
      </div>

      <p className="mt-8 text-[17px] font-semibold tracking-tight">
        {money(totals.balanceCents)} {draft.currency.toUpperCase()}
        {dueLong ? ` due ${dueLong}` : " due on receipt"}
      </p>
      {draft.notes.trim() ? (
        <p className="mt-2 whitespace-pre-line text-neutral-700">
          {draft.notes}
        </p>
      ) : null}

      <table className="mt-7 w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="pb-1.5 font-normal">Description</th>
            <th className="w-[12%] pb-1.5 text-right font-normal">Qty</th>
            <th className="w-[18%] pb-1.5 text-right font-normal">
              Unit price
            </th>
            <th className="w-[18%] pb-1.5 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-neutral-400">
                No items yet
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-2 pr-4">
                  <p>{item.name || "Untitled item"}</p>
                  {item.description.trim() ? (
                    <p className="whitespace-pre-line text-neutral-500">
                      {item.description}
                    </p>
                  ) : null}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatQuantity(item.quantity)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {money(item.unitAmountCents)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {money(lineTotalCents(item))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <dl className="mt-2 ml-auto w-1/2 border-t border-neutral-300">
        <TotalRow label="Subtotal" value={money(totals.subtotalCents)} />
        {draft.taxRateBps > 0 ? (
          <TotalRow label={taxLabel} value={money(totals.taxCents)} />
        ) : null}
        <TotalRow label="Total" value={money(totals.totalCents)} />
        {amountPaidCents > 0 ? (
          <TotalRow label="Amount paid" value={`−${money(amountPaidCents)}`} />
        ) : null}
        <TotalRow
          strong
          label="Amount due"
          value={`${money(totals.balanceCents)} ${draft.currency.toUpperCase()}`}
        />
      </dl>

      {draft.bankDetails.trim() ? (
        <section className="mt-8 space-y-1">
          <p className="font-medium">Pay by bank transfer</p>
          <p className="whitespace-pre-line text-neutral-700">
            {draft.bankDetails}
          </p>
        </section>
      ) : null}

      <footer className="mt-auto flex justify-between border-t border-neutral-200 pt-3 text-[10px] text-neutral-500">
        <span>
          {draft.number} · {money(totals.balanceCents)}
          {dueLong ? ` due ${dueLong}` : ""}
        </span>
        <span>Page 1 of 1</span>
      </footer>
    </article>
  )
}
