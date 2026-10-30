import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"

import {
  centsToInput,
  formatCents,
  inputToCents,
  lineTotalCents,
  newLineItem,
  type LineItem,
} from "@features/invoices/helpers"
import {
  paperInputClass,
  paperNumberClass,
  paperSelectTriggerClass,
} from "@features/invoices/paper-field"
import { productsQueryOptions, type Product } from "@features/products/api"

type InvoiceLinesProps = {
  slug: string
  currency: string
  readOnly: boolean
  lineItems: LineItem[]
  onChange: (items: LineItem[]) => void
}

const PICK = "__pick__"
const lineGridClass =
  "grid grid-cols-[minmax(0,1fr)_3.5rem_5rem_5.5rem_1.75rem] gap-x-3 gap-y-1"

export function InvoiceLines({
  slug,
  currency,
  readOnly,
  lineItems,
  onChange,
}: InvoiceLinesProps) {
  const items = lineItems.length > 0 ? lineItems : [newLineItem()]
  const { data } = useQuery({
    ...productsQueryOptions(slug),
    enabled: !readOnly,
  })
  const products = data?.products ?? []

  function commit(next: LineItem[]) {
    onChange(next)
  }

  function update(id: string, patch: Partial<LineItem>) {
    commit(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function remove(id: string) {
    const next = items.filter((item) => item.id !== id)
    commit(next.length > 0 ? next : [newLineItem()])
  }

  function addBlank() {
    const base =
      items.length === 1 &&
      !items[0]!.name.trim() &&
      items[0]!.unitAmountCents === 0
        ? []
        : items
    commit([...base, newLineItem()])
  }

  function addProduct(product: Product) {
    const next = newLineItem()
    next.productId = product.id
    next.name = product.name
    next.description = product.description ?? ""
    next.unitAmountCents = product.unitAmountCents
    const base =
      items.length === 1 &&
      !items[0]!.name.trim() &&
      items[0]!.unitAmountCents === 0
        ? []
        : items
    commit([...base, next])
  }

  return (
    <div className="space-y-2">
      <div
        className={`${lineGridClass} border-b border-dashed border-border pb-2 text-[11px] text-muted-foreground`}
      >
        <span>Item</span>
        <span className="text-right font-mono">Qty</span>
        <span className="text-right font-mono">Price</span>
        <span className="text-right font-mono">Total</span>
        <span />
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <LineRow
            key={item.id}
            item={item}
            currency={currency}
            readOnly={readOnly}
            canRemove={!readOnly && items.length > 1}
            onChange={(patch) => update(item.id, patch)}
            onRemove={() => remove(item.id)}
          />
        ))}
      </ul>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 py-0.5 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={addBlank}
          >
            Add line
          </Button>
          {products.length > 0 ? (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <Select
                value={PICK}
                onValueChange={(value) => {
                  if (!value || value === PICK) {
                    return
                  }
                  const product = products.find((entry) => entry.id === value)
                  if (product) {
                    addProduct(product)
                  }
                }}
              >
                <SelectTrigger
                  className={`${paperSelectTriggerClass} w-auto text-muted-foreground`}
                >
                  <SelectValue placeholder="Add from products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PICK} disabled>
                    Add from products
                  </SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-muted-foreground">
              No products yet.{" "}
              <Link
                to="/businesses/$slug/products"
                params={{ slug }}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Add products
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function LineRow({
  item,
  currency,
  readOnly,
  canRemove,
  onChange,
  onRemove,
}: {
  item: LineItem
  currency: string
  readOnly: boolean
  canRemove: boolean
  onChange: (patch: Partial<LineItem>) => void
  onRemove: () => void
}) {
  const [price, setPrice] = useState(centsToInput(item.unitAmountCents))
  const [qty, setQty] = useState(String(item.quantity))

  useEffect(() => {
    setPrice(centsToInput(item.unitAmountCents))
  }, [item.unitAmountCents])

  useEffect(() => {
    setQty(String(item.quantity))
  }, [item.quantity])

  return (
    <li className={`${lineGridClass} items-center`}>
      <Input
        value={item.name}
        disabled={readOnly}
        placeholder="Item"
        aria-label="Item name"
        className={paperInputClass}
        onChange={(event) =>
          onChange({ name: event.target.value, productId: null })
        }
      />
      <Input
        type="text"
        inputMode="decimal"
        value={qty}
        disabled={readOnly}
        className={paperNumberClass}
        aria-label="Quantity"
        onChange={(event) => {
          const next = event.target.value
          setQty(next)
          const parsed = Number(next)
          if (Number.isFinite(parsed) && parsed > 0) {
            onChange({ quantity: parsed })
          }
        }}
        onBlur={() => {
          const next = Number(qty)
          const quantity = Number.isFinite(next) && next > 0 ? next : 1
          setQty(String(quantity))
          onChange({ quantity })
        }}
      />
      <Input
        type="text"
        inputMode="decimal"
        value={price}
        disabled={readOnly}
        className={paperNumberClass}
        aria-label="Unit price"
        onChange={(event) => {
          const next = event.target.value
          setPrice(next)
          onChange({ unitAmountCents: inputToCents(next) })
        }}
        onBlur={() => {
          const unitAmountCents = inputToCents(price)
          setPrice(centsToInput(unitAmountCents))
          onChange({ unitAmountCents })
        }}
      />
      <p className="text-right font-mono text-sm tabular-nums">
        {formatCents(lineTotalCents(item), currency)}
      </p>
      <div className="flex items-center justify-end">
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remove line"
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
    </li>
  )
}
