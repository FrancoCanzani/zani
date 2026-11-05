import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"

import type { InvoiceLineItem, invoice, workspace } from "../../../../db/schema"

import { invoiceTotals, lineHasContent, lineTotalCents } from "./helpers"
import { notesForDisplay } from "./serialize"

type InvoiceRow = typeof invoice.$inferSelect
type Business = Pick<
  typeof workspace.$inferSelect,
  "name" | "email" | "phone" | "address" | "taxId"
>

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 48
const CONTENT_BOTTOM = 64
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const ink = rgb(0.09, 0.09, 0.09)
const muted = rgb(0.38, 0.38, 0.38)
const rule = rgb(0.82, 0.82, 0.82)

export async function renderInvoicePdf(row: InvoiceRow, business: Business) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const layout = new Layout(doc, font, bold)
  const items = row.lineItems.filter(lineHasContent)
  const totals = invoiceTotals(
    items,
    row.taxRateBps,
    row.taxInclusive,
    row.amountPaidCents
  )
  const money = (cents: number) => formatMoney(cents, row.currency)
  const due = formatLongDate(row.dueDate)
  const currency = row.currency.toUpperCase()
  const notes = notesForDisplay(row)

  layout.heading("Invoice")
  layout.gap(14)
  layout.meta("Invoice number", row.number || "—")
  layout.meta("Date of issue", formatLongDate(row.issueDate) ?? "—")
  layout.meta("Date due", due ?? "—")
  layout.gap(22)
  layout.columns(
    contactLines(business.name, [
      business.address,
      business.phone,
      business.email,
      business.taxId ? `Tax ID ${business.taxId}` : null,
    ]),
    contactLines(
      "Bill to",
      [
        row.customerName,
        row.customerAddress,
        row.customerPhone,
        row.customerEmail,
        row.customerTaxId ? `Tax ID ${row.customerTaxId}` : null,
      ],
      "No customer selected"
    )
  )
  layout.gap(22)
  layout.dueLine(
    `${money(totals.balanceCents)} ${currency} ${due ? `due ${due}` : "due on receipt"}`
  )
  if (notes) {
    layout.gap(8)
    layout.paragraph(notes, 10, font, muted, 14)
  }
  layout.gap(18)
  layout.table(items, money)
  layout.gap(8)
  const totalRows: [string, string][] = [
    ["Subtotal", money(totals.subtotalCents)],
  ]
  if (row.taxRateBps > 0) {
    totalRows.push([taxLabel(row), money(totals.taxCents)])
  }
  totalRows.push(["Total", money(totals.totalCents)])
  if (row.amountPaidCents > 0) {
    totalRows.push(["Amount paid", `-${money(row.amountPaidCents)}`])
  }
  totalRows.push(["Amount due", `${money(totals.balanceCents)} ${currency}`])
  layout.totals(totalRows)
  if (row.bankDetails?.trim()) {
    layout.gap(22)
    layout.paragraph("Pay by bank transfer", 11, bold, ink, 14)
    layout.gap(4)
    layout.paragraph(row.bankDetails.trim(), 10, font, muted, 14)
  }

  const footer = `${row.number} · ${money(totals.balanceCents)}${due ? ` due ${due}` : ""}`
  layout.stampFooters(footer)
  return doc.save()
}

export function invoicePdfFilename(number: string) {
  const cleaned = number
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${cleaned || "invoice"}.pdf`
}

class Layout {
  private readonly pages: PDFPage[] = []
  private y = MARGIN
  private inTable = false

  constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont
  ) {
    this.addPage()
  }

  heading(text: string) {
    this.draw(text, MARGIN, 22, this.bold, ink)
    this.y += 28
  }

  gap(amount: number) {
    this.y += amount
  }

  meta(label: string, value: string) {
    this.ensure(14)
    const top = this.y
    this.draw(label, MARGIN, 10, this.font, muted, top)
    this.draw(value, MARGIN + 108, 10, this.bold, ink, top)
    this.y += 14
  }

  dueLine(text: string) {
    this.ensure(22)
    this.draw(text, MARGIN, 14, this.bold, ink)
    this.y += 18
  }

  paragraph(
    text: string,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
    leading: number
  ) {
    for (const block of text.split("\n")) {
      const lines = wrap(this.safe(block), font, size, CONTENT_WIDTH)
      for (const line of lines.length > 0 ? lines : [""]) {
        this.ensure(leading)
        this.draw(line, MARGIN, size, font, color)
        this.y += leading
      }
    }
  }

  columns(
    left: { heading: string; lines: string[] },
    right: { heading: string; lines: string[] }
  ) {
    const columnWidth = CONTENT_WIDTH / 2 - 12
    const leftHeight = this.blockHeight(left, columnWidth)
    const rightHeight = this.blockHeight(right, columnWidth)
    this.ensure(Math.max(leftHeight, rightHeight))
    const top = this.y
    this.drawBlock(left, MARGIN, top, columnWidth)
    this.drawBlock(right, MARGIN + CONTENT_WIDTH / 2, top, columnWidth)
    this.y = top + Math.max(leftHeight, rightHeight)
  }

  table(items: InvoiceLineItem[], money: (cents: number) => string) {
    const columns = tableColumns()
    this.drawTableHeader(columns)
    if (items.length === 0) {
      this.ensure(18)
      this.draw("No items yet", MARGIN, 10, this.font, muted)
      this.y += 18
      this.inTable = false
      return
    }
    for (const item of items) {
      this.drawItem(item, columns, money)
    }
    this.inTable = false
  }

  totals(rows: readonly (readonly [string, string])[]) {
    const left = MARGIN + CONTENT_WIDTH / 2
    const right = PAGE_WIDTH - MARGIN
    this.ensure(8)
    this.ruleAt(this.y, left, right)
    this.y += 6
    rows.forEach(([label, value], index) => {
      const last = index === rows.length - 1
      const font = last ? this.bold : this.font
      this.ensure(16)
      const top = this.y
      this.draw(label, left, 10, font, ink, top)
      const width = font.widthOfTextAtSize(this.safe(value), 10)
      this.draw(value, right - width, 10, font, ink, top)
      this.y += 16
      if (!last) {
        this.ruleAt(this.y - 4, left, right)
      }
    })
  }

  stampFooters(summary: string) {
    const count = this.pages.length
    this.pages.forEach((page, index) => {
      const lineY = CONTENT_BOTTOM - 12
      page.drawLine({
        start: { x: MARGIN, y: lineY },
        end: { x: PAGE_WIDTH - MARGIN, y: lineY },
        thickness: 0.5,
        color: rule,
      })
      const label = this.safe(`Page ${index + 1} of ${count}`)
      page.drawText(this.safe(summary), {
        x: MARGIN,
        y: 28,
        size: 8,
        font: this.font,
        color: muted,
      })
      page.drawText(label, {
        x: PAGE_WIDTH - MARGIN - this.font.widthOfTextAtSize(label, 8),
        y: 28,
        size: 8,
        font: this.font,
        color: muted,
      })
    })
  }

  private addPage() {
    this.pages.push(this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]))
    this.y = MARGIN
    if (this.inTable) {
      this.drawTableHeader(tableColumns())
    }
  }

  private page() {
    return this.pages[this.pages.length - 1]!
  }

  private ensure(height: number) {
    if (this.y + height > PAGE_HEIGHT - CONTENT_BOTTOM) {
      this.addPage()
    }
  }

  private draw(
    text: string,
    x: number,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
    top = this.y
  ) {
    const value = this.safe(text)
    if (!value) return
    this.page().drawText(value, {
      x,
      y: PAGE_HEIGHT - top - size,
      size,
      font,
      color,
    })
  }

  private ruleAt(top: number, x1: number, x2: number) {
    this.page().drawLine({
      start: { x: x1, y: PAGE_HEIGHT - top },
      end: { x: x2, y: PAGE_HEIGHT - top },
      thickness: 0.5,
      color: rule,
    })
  }

  private safe(text: string) {
    return toWinAnsi(text, this.font)
  }

  private blockHeight(
    block: { heading: string; lines: string[] },
    width: number
  ) {
    const body = block.lines.flatMap((line) =>
      wrap(this.safe(line), this.font, 10, width)
    )
    return 16 + Math.max(body.length, 1) * 13
  }

  private drawBlock(
    block: { heading: string; lines: string[] },
    x: number,
    top: number,
    width: number
  ) {
    this.draw(block.heading, x, 11, this.bold, ink, top)
    let cursor = top + 16
    const lines = block.lines.flatMap((line) =>
      wrap(this.safe(line), this.font, 10, width)
    )
    for (const line of lines.length > 0 ? lines : [""]) {
      this.draw(line, x, 10, this.font, ink, cursor)
      cursor += 13
    }
  }

  private drawTableHeader(columns: ReturnType<typeof tableColumns>) {
    this.ensure(20)
    const top = this.y
    this.draw("Description", columns.description, 9, this.font, muted, top)
    this.drawRight("Qty", columns.qtyRight, 9, this.font, muted, top)
    this.drawRight("Unit price", columns.priceRight, 9, this.font, muted, top)
    this.drawRight("Amount", columns.amountRight, 9, this.font, muted, top)
    this.y += 14
    this.ruleAt(this.y, MARGIN, PAGE_WIDTH - MARGIN)
    this.y += 8
    this.inTable = true
  }

  private drawItem(
    item: InvoiceLineItem,
    columns: ReturnType<typeof tableColumns>,
    money: (cents: number) => string
  ) {
    const descriptionWidth = columns.qtyRight - 36 - MARGIN
    const nameLines = wrap(
      this.safe(item.name.trim() || "Untitled item"),
      this.font,
      10,
      descriptionWidth
    )
    const detailLines = item.description.trim()
      ? wrap(this.safe(item.description.trim()), this.font, 9, descriptionWidth)
      : []
    const height = nameLines.length * 13 + detailLines.length * 12 + 6
    this.ensure(height)
    const top = this.y
    nameLines.forEach((line, index) => {
      this.draw(line, MARGIN, 10, this.font, ink, top + index * 13)
    })
    detailLines.forEach((line, index) => {
      this.draw(
        line,
        MARGIN,
        9,
        this.font,
        muted,
        top + nameLines.length * 13 + index * 12
      )
    })
    this.drawRight(
      formatQuantity(item.quantity),
      columns.qtyRight,
      10,
      this.font,
      ink,
      top
    )
    this.drawRight(
      money(item.unitAmountCents),
      columns.priceRight,
      10,
      this.font,
      ink,
      top
    )
    this.drawRight(
      money(lineTotalCents(item)),
      columns.amountRight,
      10,
      this.font,
      ink,
      top
    )
    this.y += height
  }

  private drawRight(
    text: string,
    right: number,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
    top: number
  ) {
    const value = this.safe(text)
    this.draw(
      value,
      right - font.widthOfTextAtSize(value, size),
      size,
      font,
      color,
      top
    )
  }
}

function tableColumns() {
  const amountRight = PAGE_WIDTH - MARGIN
  const priceRight = amountRight - 78
  const qtyRight = priceRight - 78
  return {
    description: MARGIN,
    qtyRight,
    priceRight,
    amountRight,
  }
}

function contactLines(
  heading: string,
  lines: (string | null | undefined)[],
  placeholder?: string
) {
  const visible = lines
    .flatMap((line) => line?.split("\n") ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
  return {
    heading,
    lines: visible.length > 0 ? visible : placeholder ? [placeholder] : [],
  }
}

function taxLabel(row: InvoiceRow) {
  const name = row.taxName?.trim() || "Tax"
  const percent = row.taxRateBps / 100
  const rate = Number.isInteger(percent)
    ? `${percent}%`
    : `${percent.toFixed(2)}%`
  return `${name} (${rate}${row.taxInclusive ? " included" : ""})`
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
  if (!iso) return null
  const date = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatQuantity(quantity: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
    quantity
  )
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (!text) return [""]
  const lines: string[] = []
  let current = ""
  for (const word of text.split(" ")) {
    if (!word) continue
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = breakWord(word, font, size, maxWidth, lines)
  }
  if (current) lines.push(current)
  return lines
}

function breakWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  lines: string[]
) {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return word
  let chunk = ""
  for (const char of word) {
    const next = chunk + char
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      chunk = next
      continue
    }
    if (chunk) lines.push(chunk)
    chunk = char
  }
  return chunk
}

function toWinAnsi(value: string, font: PDFFont) {
  const mapped = value
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201C", '"')
    .replaceAll("\u201D", '"')
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2026", "...")
    .replaceAll("\u00A0", " ")
    .replaceAll("\u2212", "-")
  let out = ""
  for (const char of mapped) {
    if (char === "\n" || char === "\t") {
      out += " "
      continue
    }
    try {
      font.encodeText(char)
      out += char
    } catch {
      out += " "
    }
  }
  return out
}
