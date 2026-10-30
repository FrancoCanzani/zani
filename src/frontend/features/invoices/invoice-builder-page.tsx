import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/ui/accordion"
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
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@components/ui/sheet"
import { Switch } from "@components/ui/switch"
import { Textarea } from "@components/ui/textarea"

import { CustomerFields } from "@features/customers/customer-fields"
import {
  discardInvoice,
  invoiceQueryOptions,
  markInvoicePaid,
  sendInvoice,
  updateInvoice,
  type InvoiceInput,
} from "@features/invoices/api"
import {
  bpsToPercentInput,
  formatCents,
  invoiceTotals,
  percentToBps,
  type LineItem,
} from "@features/invoices/helpers"
import { InvoiceLineItems } from "@features/invoices/invoice-line-items"
import { InvoicePreview } from "@features/invoices/invoice-preview"
import { workspaceQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/invoices/$invoiceId")

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

export function InvoiceBuilderPage() {
  const { slug, invoiceId } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(invoiceQueryOptions(slug, invoiceId))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))

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
  const [paymentTerms, setPaymentTerms] = useState(
    data.invoice.paymentTerms ?? ""
  )
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
    return {
      customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      customerAddress: customerAddress.trim() || null,
      customerTaxId: customerTaxId.trim() || null,
      currency,
      issueDate,
      dueDate: dueDate || null,
      paymentTerms: paymentTerms.trim() || null,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      taxName: taxName.trim() || null,
      taxRateBps,
      taxInclusive,
      lineItems: lineItems.map((item) => ({
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

  const preview = (
    <InvoicePreview
      businessName={workspaceData.workspace.name}
      number={data.invoice.number}
      status={status}
      customerName={customerName}
      customerEmail={customerEmail}
      customerPhone={customerPhone}
      customerAddress={customerAddress}
      customerTaxId={customerTaxId}
      currency={currency}
      issueDate={issueDate}
      dueDate={dueDate || null}
      paymentTerms={paymentTerms}
      notes={notes}
      terms={terms}
      taxName={taxName}
      taxRateBps={taxRateBps}
      taxInclusive={taxInclusive}
      lineItems={lineItems}
      amountPaidCents={amountPaidCents}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <p className="truncate font-mono text-sm tracking-tight text-muted-foreground">
          {data.invoice.number}
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 lg:hidden"
            >
              Preview
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[92vh] overflow-y-auto bg-neutral-100 p-4 sm:p-6"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Preview</SheetTitle>
            </SheetHeader>
            {preview}
          </SheetContent>
        </Sheet>
      </div>

      {actionError ? (
        <p className="shrink-0 pb-3 text-sm text-destructive" role="alert">
          {actionError.message}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden pb-20 lg:grid-cols-2">
        <div className="min-h-0 min-w-0 overflow-y-auto pr-1">
          <Accordion
            type="single"
            collapsible
            defaultValue="customer"
            className="w-full gap-3"
          >
            <BuilderSection value="customer" title="Customer">
              <CustomerFields
                slug={slug}
                readOnly={readOnly}
                customerId={customerId}
                customerName={customerName}
                customerPhone={customerPhone}
                customerEmail={customerEmail}
                customerAddress={customerAddress}
                customerTaxId={customerTaxId}
                onChange={(next) => {
                  setCustomerId(next.customerId)
                  setCustomerName(next.customerName)
                  setCustomerPhone(next.customerPhone)
                  setCustomerEmail(next.customerEmail)
                  setCustomerAddress(next.customerAddress)
                  setCustomerTaxId(next.customerTaxId)
                }}
              />
            </BuilderSection>

            <BuilderSection value="details" title="Details">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      disabled={readOnly}
                      onChange={(event) => setIssueDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      disabled={readOnly}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={currency}
                    disabled={readOnly}
                    onValueChange={(value) => {
                      if (value) {
                        setCurrency(value)
                      }
                    }}
                  >
                    <SelectTrigger id="currency" className="w-full">
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
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="paymentTerms">Payment terms</Label>
                    <span className="text-xs text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <Input
                    id="paymentTerms"
                    value={paymentTerms}
                    disabled={readOnly}
                    onChange={(event) => setPaymentTerms(event.target.value)}
                    placeholder="50% of total amount upfront"
                  />
                  <p className="text-xs text-muted-foreground">
                    Terms of payment
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_6.5rem]">
                  <div className="space-y-2">
                    <Label htmlFor="taxName">Tax</Label>
                    <Input
                      id="taxName"
                      value={taxName}
                      disabled={readOnly}
                      onChange={(event) => setTaxName(event.target.value)}
                      placeholder="VAT, GST…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Rate %</Label>
                    <Input
                      id="taxRate"
                      inputMode="decimal"
                      defaultValue={bpsToPercentInput(taxRateBps)}
                      disabled={readOnly}
                      key={taxRateBps}
                      onBlur={(event) =>
                        setTaxRateBps(percentToBps(event.target.value))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="taxInclusive"
                    checked={taxInclusive}
                    disabled={readOnly}
                    onCheckedChange={setTaxInclusive}
                  />
                  <Label htmlFor="taxInclusive" className="font-normal">
                    Prices include tax
                  </Label>
                </div>
              </div>
            </BuilderSection>

            <BuilderSection value="items" title="Items">
              <InvoiceLineItems
                slug={slug}
                currency={currency}
                readOnly={readOnly}
                lineItems={lineItems}
                onChange={setLineItems}
              />
            </BuilderSection>

            <BuilderSection value="additional" title="Additional information">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <span className="text-xs text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <Textarea
                    id="notes"
                    value={notes}
                    disabled={readOnly}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Any relevant information not already covered"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional notes for the invoice
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="terms">Terms</Label>
                    <span className="text-xs text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <Textarea
                    id="terms"
                    value={terms}
                    disabled={readOnly}
                    onChange={(event) => setTerms(event.target.value)}
                    placeholder="Late fees, payment methods, delivery terms, etc."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Terms and conditions for the invoice
                  </p>
                </div>
              </div>
            </BuilderSection>
          </Accordion>
        </div>

        <div className="hidden min-h-0 min-w-0 overflow-y-auto lg:block">
          <div className="rounded-xl bg-neutral-100 p-4">{preview}</div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="min-w-0 truncate text-sm font-medium tabular-nums">
            {formatCents(totals.totalCents, currency)}
            {taxRateBps > 0 ? (
              <span className="ml-2 font-normal text-muted-foreground">
                Subtotal {formatCents(totals.subtotalCents, currency)}
              </span>
            ) : null}
            {totals.balanceCents !== totals.totalCents ? (
              <span className="ml-2 font-normal text-muted-foreground">
                Balance {formatCents(totals.balanceCents, currency)}
              </span>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {isDraft ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" disabled={busy}>
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

function BuilderSection({
  value,
  title,
  children,
}: {
  value: string
  title: string
  children: ReactNode
}) {
  return (
    <AccordionItem
      value={value}
      className="rounded-xl border border-border bg-background"
    >
      <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">{children}</AccordionContent>
    </AccordionItem>
  )
}
