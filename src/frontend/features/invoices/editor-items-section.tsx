import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState, type SubmitEvent } from "react"

import { Button } from "@components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Field, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@components/ui/input-group"
import { Label } from "@components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Switch } from "@components/ui/switch"
import { Textarea } from "@components/ui/textarea"

import {
  createProduct,
  productsQueryOptions,
  type Product,
} from "@features/products/api"
import {
  bpsToPercentInput,
  centsToInput,
  formatCents,
  formatQuantity,
  formatTaxRate,
  inputToCents,
  invoiceTotals,
  lineTotalCents,
  newLineItem,
  percentToBps,
  type LineItem,
} from "@features/invoices/helpers"
import type { InvoiceDraft } from "@features/invoices/invoice-draft"

type ItemsPatch = Partial<
  Pick<InvoiceDraft, "lineItems" | "taxName" | "taxRateBps" | "taxInclusive">
>

export function EditorItemsSection({
  slug,
  draft,
  amountPaidCents,
  onChange,
}: {
  slug: string
  draft: InvoiceDraft
  amountPaidCents: number
  onChange: (patch: ItemsPatch) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [taxOpen, setTaxOpen] = useState(draft.taxRateBps > 0)
  const items = draft.lineItems
  const money = (cents: number) => formatCents(cents, draft.currency)
  const totals = invoiceTotals(
    items,
    draft.taxRateBps,
    draft.taxInclusive,
    amountPaidCents
  )

  function update(id: string, patch: Partial<LineItem>) {
    onChange({
      lineItems: items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    })
  }

  function remove(id: string) {
    onChange({ lineItems: items.filter((item) => item.id !== id) })
    setEditingId(null)
  }

  function add(item: LineItem, edit: boolean) {
    onChange({ lineItems: [...items, item] })
    setEditingId(edit ? item.id : null)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-light tracking-tight">Items</h2>

      {items.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) =>
            item.id === editingId ? (
              <li key={item.id}>
                <ItemEditor
                  item={item}
                  currency={draft.currency}
                  onChange={(patch) => update(item.id, patch)}
                  onRemove={() => remove(item.id)}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  onClick={() => setEditingId(item.id)}
                >
                  <span className="min-w-0 space-y-0.5">
                    <span className="block truncate">
                      {item.name.trim() || "Untitled item"}
                    </span>
                    <span className="block text-muted-foreground">
                      Qty {formatQuantity(item.quantity)} ×{" "}
                      {money(item.unitAmountCents)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {money(lineTotalCents(item))}
                  </span>
                </button>
              </li>
            )
          )}
        </ul>
      ) : null}

      <AddItemButton
        slug={slug}
        currency={draft.currency}
        onAddProduct={(product) => {
          const item = newLineItem()
          item.productId = product.id
          item.name = product.name
          item.description = product.description ?? ""
          item.unitAmountCents = product.unitAmountCents
          add(item, false)
        }}
        onAddOneTime={(name) => {
          const item = newLineItem()
          item.name = name
          add(item, true)
        }}
      />

      <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-2 pt-3 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right tabular-nums">
          {money(totals.subtotalCents)}
        </dd>
        {taxOpen ? (
          <>
            <dt className="text-muted-foreground">
              {draft.taxName.trim() || "Tax"} {formatTaxRate(draft.taxRateBps)}
            </dt>
            <dd className="text-right tabular-nums">
              {money(totals.taxCents)}
            </dd>
          </>
        ) : null}
        <dt className="border-t border-border pt-2 font-medium">Total</dt>
        <dd className="border-t border-border pt-2 text-right font-medium tabular-nums">
          {money(totals.totalCents)}
        </dd>
        {amountPaidCents > 0 ? (
          <>
            <dt className="text-muted-foreground">Amount paid</dt>
            <dd className="text-right tabular-nums">
              −{money(amountPaidCents)}
            </dd>
            <dt className="font-medium">Amount due</dt>
            <dd className="text-right font-medium tabular-nums">
              {money(totals.balanceCents)}
            </dd>
          </>
        ) : null}
      </dl>

      {taxOpen ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field>
              <FieldLabel htmlFor="tax-name">Tax name</FieldLabel>
              <Input
                id="tax-name"
                value={draft.taxName}
                placeholder="Sales tax"
                onChange={(event) => onChange({ taxName: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tax-rate">Rate</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="tax-rate"
                  inputMode="decimal"
                  defaultValue={bpsToPercentInput(draft.taxRateBps)}
                  key={draft.taxRateBps}
                  className="text-right tabular-nums"
                  onBlur={(event) =>
                    onChange({ taxRateBps: percentToBps(event.target.value) })
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="tax-inclusive" className="font-normal">
              Prices include tax
            </Label>
            <Switch
              id="tax-inclusive"
              checked={draft.taxInclusive}
              onCheckedChange={(checked) => onChange({ taxInclusive: checked })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            onClick={() => {
              onChange({ taxRateBps: 0, taxName: "", taxInclusive: false })
              setTaxOpen(false)
            }}
          >
            Remove tax
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => setTaxOpen(true)}
        >
          <PlusIcon />
          Add tax
        </Button>
      )}
    </section>
  )
}

function AddItemButton({
  slug,
  currency,
  onAddProduct,
  onAddOneTime,
}: {
  slug: string
  currency: string
  onAddProduct: (product: Product) => void
  onAddOneTime: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState<string | null>(null)
  const { data } = useQuery(productsQueryOptions(slug))
  const products = (data?.products ?? []).filter(
    (product) => !product.archivedAt
  )

  function close() {
    setOpen(false)
    setSearch("")
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline">
            <PlusIcon />
            Add item
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput
              placeholder="Find or add an item…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No saved products match.</CommandEmpty>
              {products.length > 0 ? (
                <CommandGroup heading="Products">
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.id}`}
                      onSelect={() => {
                        onAddProduct(product)
                        close()
                      }}
                    >
                      <span className="truncate">{product.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {formatCents(product.unitAmountCents, product.currency)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              <CommandSeparator alwaysRender />
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value="__one_time__"
                  onSelect={() => {
                    onAddOneTime(search.trim())
                    close()
                  }}
                >
                  <PlusIcon />
                  {search.trim()
                    ? `Add “${search.trim()}” as a one-time item`
                    : "Add a one-time item"}
                </CommandItem>
                <CommandItem
                  forceMount
                  value="__new_product__"
                  onSelect={() => {
                    setCreating(search.trim())
                    close()
                  }}
                >
                  <PlusIcon />
                  {search.trim()
                    ? `Set up “${search.trim()}” as a new product`
                    : "Set up a new product"}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <NewProductDialog
          slug={slug}
          currency={currency}
          initialName={creating}
          onClose={() => setCreating(null)}
          onCreated={(product) => {
            onAddProduct(product)
            setCreating(null)
          }}
        />
      </Popover>
    </>
  )
}

function NewProductDialog({
  slug,
  currency,
  initialName,
  onClose,
  onCreated,
}: {
  slug: string
  currency: string
  initialName: string | null
  onClose: () => void
  onCreated: (product: Product) => void
}) {
  const open = initialName !== null
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        {open ? (
          <NewProductForm
            slug={slug}
            currency={currency}
            initialName={initialName}
            onCancel={onClose}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NewProductForm({
  slug,
  currency,
  initialName,
  onCancel,
  onCreated,
}: {
  slug: string
  currency: string
  initialName: string
  onCancel: () => void
  onCreated: (product: Product) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("0.00")

  const create = useMutation({
    mutationFn: () =>
      createProduct(slug, {
        name: name.trim(),
        description: description.trim() || null,
        unitAmountCents: inputToCents(price),
        currency,
      }),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["products", slug] })
      onCreated(body.product)
    },
  })

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim()) create.mutate()
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>Set up product</DialogTitle>
        <DialogDescription>
          Saved to this business so the next invoice can reuse it.
        </DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="new-product-name">Name</FieldLabel>
        <Input
          id="new-product-name"
          value={name}
          autoFocus
          required
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-product-description">Description</FieldLabel>
        <Textarea
          id="new-product-description"
          value={description}
          rows={2}
          placeholder="Optional"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-product-price">Price</FieldLabel>
        <Input
          id="new-product-price"
          inputMode="decimal"
          value={price}
          className="tabular-nums"
          onChange={(event) => setPrice(event.target.value)}
          onBlur={() => setPrice(centsToInput(inputToCents(price)))}
        />
      </Field>
      {create.error ? (
        <p className="text-sm text-destructive" role="alert">
          {create.error.message}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending || !name.trim()}>
          {create.isPending ? "Saving…" : "Save product"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ItemEditor({
  item,
  currency,
  onChange,
  onRemove,
  onDone,
}: {
  item: LineItem
  currency: string
  onChange: (patch: Partial<LineItem>) => void
  onRemove: () => void
  onDone: () => void
}) {
  const [qty, setQty] = useState(String(item.quantity))
  const [price, setPrice] = useState(centsToInput(item.unitAmountCents))
  const symbol =
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? ""

  return (
    <div className="space-y-4 bg-muted/30 p-4">
      <Field>
        <FieldLabel htmlFor={`item-name-${item.id}`}>Item</FieldLabel>
        <Input
          id={`item-name-${item.id}`}
          value={item.name}
          autoFocus={!item.name}
          placeholder="Service or product"
          onChange={(event) =>
            onChange({ name: event.target.value, productId: null })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`item-desc-${item.id}`}>Description</FieldLabel>
        <Textarea
          id={`item-desc-${item.id}`}
          value={item.description}
          rows={2}
          placeholder="Optional"
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`item-qty-${item.id}`}>Quantity</FieldLabel>
          <Input
            id={`item-qty-${item.id}`}
            inputMode="decimal"
            value={qty}
            className="tabular-nums"
            onChange={(event) => {
              setQty(event.target.value)
              const parsed = Number(event.target.value)
              if (Number.isFinite(parsed) && parsed > 0) {
                onChange({ quantity: parsed })
              }
            }}
            onBlur={() => {
              const parsed = Number(qty)
              const quantity =
                Number.isFinite(parsed) && parsed > 0 ? parsed : 1
              setQty(String(quantity))
              onChange({ quantity })
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`item-price-${item.id}`}>Price</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>{symbol}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id={`item-price-${item.id}`}
              inputMode="decimal"
              value={price}
              className="tabular-nums"
              onChange={(event) => {
                setPrice(event.target.value)
                onChange({ unitAmountCents: inputToCents(event.target.value) })
              }}
              onBlur={() => setPrice(centsToInput(inputToCents(price)))}
            />
          </InputGroup>
        </Field>
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2Icon />
          Remove
        </Button>
        <Button type="button" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
