import puppeteer from "@cloudflare/puppeteer"
import type { InvoiceLineItem, invoice, workspace } from "../../../../db/schema"

import { invoiceTotals, lineTotalCents } from "./helpers"

type InvoiceRow = typeof invoice.$inferSelect
type Business = Pick<
  typeof workspace.$inferSelect,
  "name" | "email" | "phone" | "address" | "taxId"
>

export async function renderInvoicePdf(
  env: Env,
  row: InvoiceRow,
  business: Business,
  locale: string
) {
  const browser = await puppeteer.launch(env.BROWSER)
  try {
    const page = await browser.newPage()
    await page.setContent(invoiceHtml(row, business, locale), {
      waitUntil: "load",
      timeout: 20_000,
    })
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: footerTemplate(row, locale),
      margin: {
        top: "0.55in",
        right: "0.65in",
        bottom: "0.6in",
        left: "0.65in",
      },
    })
    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}

export function invoicePdfFilename(number: string) {
  const cleaned = number
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${cleaned || "invoice"}.pdf`
}

export function requestLocale(header: string | undefined) {
  const tag = header?.split(",")[0]?.split(";")[0]?.trim()
  if (!tag || !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag)) {
    return "en"
  }
  return tag
}

function invoiceHtml(row: InvoiceRow, business: Business, locale: string) {
  const totals = invoiceTotals(
    row.lineItems,
    row.taxRateBps,
    row.taxInclusive,
    row.amountPaidCents
  )
  const money = (cents: number) => formatMoney(cents, row.currency, locale)
  const due = formatLongDate(row.dueDate, locale)
  const currency = row.currency.toUpperCase()
  const notes = [row.notes, row.terms]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n")
  const items = row.lineItems.filter(
    (item) => item.name.trim() || item.unitAmountCents > 0
  )
  const dueLine = `${money(totals.balanceCents)} ${currency} ${due ? `due ${due}` : "due on receipt"}`

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; color: #171717; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 11px; line-height: 1.45; }
  h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  h2 { margin: 0; font-size: 11px; font-weight: 600; }
  p { margin: 0; }
  .meta { display: grid; grid-template-columns: auto auto; gap: 2px 24px; width: fit-content; margin-top: 20px; }
  .meta dt { color: #737373; }
  .meta dd { margin: 0; font-weight: 500; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px; }
  .pre { white-space: pre-line; }
  .muted { color: #404040; }
  .faint { color: #a3a3a3; }
  .due { margin-top: 32px; font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
  .notes { margin-top: 8px; }
  table { width: 100%; margin-top: 28px; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { padding: 0 16px 6px 0; border-bottom: 1px solid #d4d4d4; color: #737373; font-weight: 400; text-align: left; }
  td { padding: 8px 16px 0 0; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tr { break-inside: avoid; }
  .totals { width: 50%; margin: 8px 0 0 auto; border-top: 1px solid #d4d4d4; }
  .totals div { display: flex; justify-content: space-between; gap: 24px; padding: 6px 0; border-bottom: 1px solid #e5e5e5; }
  .totals .strong { font-weight: 600; }
  .bank { margin-top: 32px; break-inside: avoid; }
  .bank p + p { margin-top: 4px; }
</style>
</head>
<body>
  <h1>Invoice</h1>
  <dl class="meta">
    <dt>Invoice number</dt><dd>${text(row.number || "—")}</dd>
    <dt>Date of issue</dt><dd>${text(formatLongDate(row.issueDate, locale) ?? "—")}</dd>
    <dt>Date due</dt><dd>${text(due ?? "—")}</dd>
  </dl>
  <div class="parties">
    ${party(business.name, [business.address, business.phone, business.email, business.taxId ? `Tax ID ${business.taxId}` : null])}
    ${party("Bill to", [row.customerName, row.customerAddress, row.customerPhone, row.customerEmail, row.customerTaxId ? `Tax ID ${row.customerTaxId}` : null], "No customer selected")}
  </div>
  <p class="due">${text(dueLine)}</p>
  ${notes ? `<p class="notes pre muted">${text(notes)}</p>` : ""}
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.length === 0 ? `<tr><td class="faint" colspan="4">No items yet</td></tr>` : items.map((item) => itemRow(item, money, locale)).join("")}
    </tbody>
  </table>
  <div class="totals">
    ${totalRow("Subtotal", money(totals.subtotalCents))}
    ${row.taxRateBps > 0 ? totalRow(taxLabel(row), money(totals.taxCents)) : ""}
    ${totalRow("Total", money(totals.totalCents))}
    ${row.amountPaidCents > 0 ? totalRow("Amount paid", `−${money(row.amountPaidCents)}`) : ""}
    ${totalRow("Amount due", `${money(totals.balanceCents)} ${currency}`, true)}
  </div>
  ${
    row.bankDetails?.trim()
      ? `<section class="bank"><p>Pay by bank transfer</p><p class="pre muted">${text(row.bankDetails.trim())}</p></section>`
      : ""
  }
</body>
</html>`
}

function party(
  heading: string,
  lines: (string | null | undefined)[],
  placeholder?: string
) {
  const visible = lines
    .flatMap((line) => line?.split("\n") ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
  const body =
    visible.length > 0
      ? `<p class="pre">${text(visible.join("\n"))}</p>`
      : placeholder
        ? `<p class="faint">${text(placeholder)}</p>`
        : ""
  return `<section><h2>${text(heading)}</h2>${body}</section>`
}

function itemRow(
  item: InvoiceLineItem,
  money: (cents: number) => string,
  locale: string
) {
  const description = item.description.trim()
    ? `<p class="pre muted">${text(item.description.trim())}</p>`
    : ""
  return `<tr>
    <td><p>${text(item.name.trim() || "Untitled item")}</p>${description}</td>
    <td class="num">${text(formatQuantity(item.quantity, locale))}</td>
    <td class="num">${text(money(item.unitAmountCents))}</td>
    <td class="num">${text(money(lineTotalCents(item)))}</td>
  </tr>`
}

function totalRow(label: string, value: string, strong = false) {
  return `<div class="${strong ? "strong" : ""}"><span>${text(label)}</span><span class="num">${text(value)}</span></div>`
}

function footerTemplate(row: InvoiceRow, locale: string) {
  const totals = invoiceTotals(
    row.lineItems,
    row.taxRateBps,
    row.taxInclusive,
    row.amountPaidCents
  )
  const due = formatLongDate(row.dueDate, locale)
  const summary = `${row.number} · ${formatMoney(totals.balanceCents, row.currency, locale)}${due ? ` due ${due}` : ""}`
  return `<div style="width:100%;font-size:10px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#737373;padding:0 8px;display:flex;justify-content:space-between;">
    <span>${text(summary)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`
}

function taxLabel(row: InvoiceRow) {
  const name = row.taxName?.trim() || "Tax"
  const percent = row.taxRateBps / 100
  const rate = Number.isInteger(percent)
    ? `${percent}%`
    : `${percent.toFixed(2)}%`
  return `${name} (${rate}${row.taxInclusive ? " included" : ""})`
}

function formatMoney(cents: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatLongDate(iso: string | null, locale: string) {
  if (!iso) return null
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date)
  } catch {
    return iso
  }
}

function formatQuantity(quantity: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 3,
    }).format(quantity)
  } catch {
    return String(quantity)
  }
}

function text(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
