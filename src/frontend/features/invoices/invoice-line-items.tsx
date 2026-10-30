import { Trash2Icon } from "lucide-react"
import { useState, type SubmitEvent } from "react"

import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"

import {
  centsToInput,
  formatCents,
  inputToCents,
  lineTotalCents,
  type LineItem,
} from "@features/invoices/helpers"
import { ProductFields } from "@features/products/product-fields"
import type { Product } from "@features/products/api"

type InvoiceLineItemsProps = {
  slug: string
  currency: string
  readOnly: boolean
  lineItems: LineItem[]
  onChange: (items: LineItem[]) => void
}

export function InvoiceLineItems({
  slug,
  currency,
  readOnly,
  lineItems,
  onChange,
}: InvoiceLineItemsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState("0.00")
  const [formError, setFormError] = useState<string | null>(null)

  function updateLine(id: string, patch: Partial<LineItem>) {
    onChange(
      lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  function resetForm() {
    setEditingId(null)
    setProductId(null)
    setName("")
    setDescription("")
    setQuantity("1")
    setPrice("0.00")
    setFormError(null)
  }

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(item: LineItem) {
    setEditingId(item.id)
    setProductId(item.productId)
    setName(item.name)
    setDescription(item.description)
    setQuantity(String(item.quantity))
    setPrice(centsToInput(item.unitAmountCents))
    setFormError(null)
    setDialogOpen(true)
  }

  function applyProduct(product: Product | null) {
    setProductId(product?.id ?? null)
    if (!product) {
      return
    }
    setName(product.name)
    setDescription(product.description ?? "")
    setPrice(centsToInput(product.unitAmountCents))
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!name.trim()) {
      setFormError("Enter an item name.")
      return
    }
    const qty = Number(quantity)
    const next: LineItem = {
      id: editingId ?? crypto.randomUUID(),
      productId,
      name: name.trim(),
      description: description.trim(),
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unitAmountCents: inputToCents(price),
    }
    if (editingId) {
      updateLine(editingId, next)
    } else {
      onChange([...lineItems, next])
    }
    setDialogOpen(false)
    resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {lineItems.length === 0
            ? "No items yet"
            : `${lineItems.length} item${lineItems.length === 1 ? "" : "s"}`}
        </p>
        {!readOnly ? (
          <Button type="button" variant="outline" size="sm" onClick={openCreate}>
            Add item
          </Button>
        ) : null}
      </div>

      {lineItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Add a product or a custom line.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border border-border">
          {lineItems.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left disabled:cursor-default"
                disabled={readOnly}
                onClick={() => {
                  if (!readOnly) {
                    openEdit(item)
                  }
                }}
              >
                <p className="truncate font-medium">
                  {item.name.trim() || "Untitled item"}
                </p>
                {item.description.trim() ? (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {item.quantity} × {formatCents(item.unitAmountCents, currency)}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <p className="tabular-nums text-sm">
                  {formatCents(lineTotalCents(item), currency)}
                </p>
                {!readOnly && lineItems.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove line"
                    onClick={() =>
                      onChange(lineItems.filter((entry) => entry.id !== item.id))
                    }
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit item" : "Add item"}
            </DialogTitle>
            <DialogDescription>
              Pick a saved product or enter a custom line.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <ProductFields
              slug={slug}
              currency={currency}
              productId={productId}
              onSelect={applyProduct}
            />
            <div className="space-y-2">
              <Label htmlFor="item-name">Item name</Label>
              <Input
                id="item-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setProductId(null)
                }}
                placeholder="Service or product"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Input
                id="item-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="item-qty">Quantity</Label>
                <Input
                  id="item-qty"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-price">Unit price</Label>
                <Input
                  id="item-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value)
                    setProductId(null)
                  }}
                  onBlur={() => setPrice(centsToInput(inputToCents(price)))}
                />
              </div>
            </div>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Save item" : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
