import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { PlusIcon, Trash2Icon } from "lucide-react"
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
  AlertDialogTrigger,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"

import { CustomerFields } from "@features/customers/customer-fields"
import {
  discardEstimate,
  estimateQueryOptions,
  updateEstimate,
  type EstimateInput,
} from "@features/estimates/api"
import {
  centsToInput,
  depositCents,
  formatCents,
  inputToCents,
  newLineItem,
  subtotalCents,
  type LineItem,
} from "@features/estimates/money"

const routeApi = getRouteApi(
  "/_authed/dashboard/$slug/estimates/$estimateId"
)

export function EstimateBuilderPage() {
  const { slug, estimateId } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(estimateQueryOptions(slug, estimateId))

  const [title, setTitle] = useState(data.estimate.title)
  const [customerId, setCustomerId] = useState(data.estimate.customerId)
  const [customerName, setCustomerName] = useState(data.estimate.customerName)
  const [customerPhone, setCustomerPhone] = useState(
    data.estimate.customerPhone ?? ""
  )
  const [customerEmail, setCustomerEmail] = useState(
    data.estimate.customerEmail ?? ""
  )
  const [notes, setNotes] = useState(data.estimate.notes ?? "")
  const [depositPercent, setDepositPercent] = useState(
    data.estimate.depositPercent
  )
  const [lineItems, setLineItems] = useState<LineItem[]>(
    data.estimate.lineItems
  )
  const [savedFlash, setSavedFlash] = useState(false)

  const currency = data.estimate.currency
  const readOnly =
    data.estimate.status === "accepted" || data.estimate.status === "cancelled"
  const subtotal = subtotalCents(lineItems)
  const deposit = depositCents(subtotal, depositPercent)

  const isDraft = data.estimate.status === "draft"

  const save = useMutation({
    mutationFn: (body: EstimateInput) =>
      updateEstimate(slug, estimateId, body),
    onSuccess: async (body) => {
      setCustomerId(body.estimate.customerId)
      queryClient.setQueryData(["estimate", slug, estimateId], body)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["estimates", slug] }),
        queryClient.invalidateQueries({ queryKey: ["customers", slug] }),
      ])
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1500)
    },
  })

  const discard = useMutation({
    mutationFn: () => discardEstimate(slug, estimateId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["estimates", slug] })
      queryClient.removeQueries({ queryKey: ["estimate", slug, estimateId] })
      await navigate({ to: "/dashboard/$slug", params: { slug } })
    },
  })

  function buildBody(): EstimateInput {
    return {
      title: title.trim(),
      customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      currency,
      lineItems: lineItems.map((item) => ({
        ...item,
        description: item.description.trim(),
        quantity: item.quantity > 0 ? item.quantity : 1,
        unitAmountCents: Math.max(0, Math.round(item.unitAmountCents)),
      })),
      depositPercent,
      notes: notes.trim() || null,
    }
  }

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pb-36">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard/$slug"
          params={{ slug }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Estimates
        </Link>
        <p className="text-sm capitalize text-muted-foreground">
          {data.estimate.status}
        </p>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Estimate</h1>
        <p className="text-sm text-muted-foreground">
          Keep it clear. Totals update as you type.
        </p>
      </div>

      {save.error || discard.error ? (
        <p className="text-sm text-destructive" role="alert">
          {save.error?.message ?? discard.error?.message}
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            value={title}
            disabled={readOnly}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Kitchen remodel — phase 1"
          />
        </div>
        <CustomerFields
          slug={slug}
          readOnly={readOnly}
          customerId={customerId}
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          onChange={(next) => {
            setCustomerId(next.customerId)
            setCustomerName(next.customerName)
            setCustomerPhone(next.customerPhone)
            setCustomerEmail(next.customerEmail)
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Line items
          </h2>
          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLineItems((items) => [...items, newLineItem()])}
            >
              <PlusIcon />
              Add
            </Button>
          ) : null}
        </div>

        <ul className="space-y-4">
          {lineItems.map((item, index) => (
            <li
              key={item.id}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Label htmlFor={`desc-${item.id}`}>Item {index + 1}</Label>
                {!readOnly && lineItems.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove line"
                    onClick={() =>
                      setLineItems((items) =>
                        items.filter((entry) => entry.id !== item.id)
                      )
                    }
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>
              <Input
                id={`desc-${item.id}`}
                value={item.description}
                disabled={readOnly}
                onChange={(event) =>
                  updateLine(item.id, { description: event.target.value })
                }
                placeholder="Labor, materials…"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`qty-${item.id}`}>Qty</Label>
                  <Input
                    id={`qty-${item.id}`}
                    inputMode="decimal"
                    value={String(item.quantity)}
                    disabled={readOnly}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      updateLine(item.id, {
                        quantity:
                          Number.isFinite(next) && next > 0 ? next : 0,
                      })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`price-${item.id}`}>Unit price</Label>
                  <Input
                    id={`price-${item.id}`}
                    inputMode="decimal"
                    defaultValue={centsToInput(item.unitAmountCents)}
                    disabled={readOnly}
                    key={`${item.id}-${item.unitAmountCents}`}
                    onBlur={(event) =>
                      updateLine(item.id, {
                        unitAmountCents: inputToCents(event.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-right text-sm tabular-nums text-muted-foreground">
                {formatCents(
                  Math.round(item.quantity * item.unitAmountCents),
                  currency
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="depositPercent">Deposit %</Label>
          <Input
            id="depositPercent"
            inputMode="numeric"
            value={String(depositPercent)}
            disabled={readOnly}
            onChange={(event) => {
              const next = Number(event.target.value.replace(/[^0-9]/g, ""))
              if (!Number.isFinite(next)) {
                setDepositPercent(0)
                return
              }
              setDepositPercent(Math.min(100, Math.max(0, next)))
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional — materials, timing, exclusions"
            rows={3}
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm text-muted-foreground">
              Total {formatCents(subtotal, currency)}
            </p>
            <p className="truncate font-medium tabular-nums">
              Deposit {formatCents(deposit, currency)}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {depositPercent}%
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isDraft ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={discard.isPending || save.isPending}
                  >
                    Discard
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the estimate. This cannot be
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
                disabled={save.isPending || discard.isPending}
                onClick={() => save.mutate(buildBody())}
              >
                {save.isPending ? "Saving…" : savedFlash ? "Saved" : "Save"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
