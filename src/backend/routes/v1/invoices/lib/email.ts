import type { invoice, workspace } from "../../../../db/schema"
import { sendAppEmail } from "../../../../lib/mail"

import { invoiceTotals } from "./helpers"
import { invoicePdfFilename, renderInvoicePdf } from "./pdf"

type InvoiceRow = typeof invoice.$inferSelect
type Business = Pick<
  typeof workspace.$inferSelect,
  "name" | "email" | "phone" | "address" | "taxId"
>

export type InvoiceMailKind = "invoice" | "reminder"

export async function sendInvoiceMail(
  env: Env,
  kind: InvoiceMailKind,
  row: InvoiceRow,
  business: Business
) {
  const to = row.customerEmail?.trim() ?? ""
  const bytes = await renderInvoicePdf(row, business)
  const copy = messageCopy(kind, row, business.name)
  const replyTo = business.email?.trim()

  return sendAppEmail(env, undefined, {
    to,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
    devLine: `[invoice] ${devLabel(kind)} ${to} ${row.number}`,
    replyTo: replyTo || undefined,
    fromName: business.name,
    attachments: [
      {
        disposition: "attachment",
        filename: invoicePdfFilename(row.number),
        type: "application/pdf",
        content: bytes,
      },
    ],
  })
}

function devLabel(kind: InvoiceMailKind) {
  switch (kind) {
    case "invoice":
      return "send"
    case "reminder":
      return "remind"
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function messageCopy(
  kind: InvoiceMailKind,
  row: InvoiceRow,
  businessName: string
) {
  switch (kind) {
    case "invoice":
      return invoiceCopy(row, businessName)
    case "reminder":
      return reminderCopy(row, businessName)
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function invoiceCopy(row: InvoiceRow, businessName: string) {
  const due = formatLongDate(row.dueDate)
  const lines = [
    `${businessName} sent you invoice ${row.number}.`,
    `Amount due: ${formatMoney(balanceOf(row), row.currency)}.`,
    due ? `Due ${due}.` : "Due on receipt.",
    ...bankLines(row.bankDetails),
    "The invoice is attached.",
  ]
  return {
    subject: `Invoice ${row.number} from ${businessName}`,
    text: lines.join("\n\n"),
    html: lines.map(htmlParagraph).join(""),
  }
}

function reminderCopy(row: InvoiceRow, businessName: string) {
  const due = formatLongDate(row.dueDate)
  const overdue = isOverdue(row.dueDate)
  const lines = [
    overdue
      ? `${businessName} is reminding you that invoice ${row.number} is overdue.`
      : `${businessName} is reminding you about invoice ${row.number}.`,
    `Amount still due: ${formatMoney(balanceOf(row), row.currency)}.`,
    overdue && due
      ? `It was due ${due}.`
      : due
        ? `Due ${due}.`
        : "Due on receipt.",
    ...bankLines(row.bankDetails),
    "The invoice is attached.",
  ]
  return {
    subject: overdue
      ? `Invoice ${row.number} is overdue`
      : `Payment reminder for invoice ${row.number}`,
    text: lines.join("\n\n"),
    html: lines.map(htmlParagraph).join(""),
  }
}

function bankLines(bankDetails: string | null) {
  const details = bankDetails?.trim()
  if (!details) {
    return []
  }
  return ["Pay by bank transfer:", details]
}

function balanceOf(row: InvoiceRow) {
  return invoiceTotals(
    row.lineItems,
    row.taxRateBps,
    row.taxInclusive,
    row.amountPaidCents
  ).balanceCents
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) {
    return false
  }
  return dueDate < new Date().toISOString().slice(0, 10)
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatLongDate(iso: string | null) {
  if (!iso) {
    return null
  }
  const date = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function htmlParagraph(value: string) {
  return `<p>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
