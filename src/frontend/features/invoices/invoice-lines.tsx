import { useQuery } from "@tanstack/react-query"
import { Trash2Icon } from "lucide-react"
import { useState } from "react"

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
import { productsQueryOptions } from "@features/products/api"

type InvoiceLinesProps = {
  slug: string
  currency: string
  readOnly: boolean
  lineItems: LineItem[]
  onChange: (items: LineItem[]) => void
}

const CUSTOM = "__custom__"

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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_5.5rem_5.5rem_1.75rem] gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Price</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <LineRow
            key={item.id}
            item={item}
            currency={currency}
            readOnly={readOnly}
            products={products}
            canRemove={!readOnly && items.length > 1}
            onChange={(patch) => update(item.id, patch)}
            onRemove={() => remove(item.id)}
          />
        ))}
      </ul>

      {!readOnly ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => commit([...items, newLineItem()])}
        >
          Add line
        </Button>
      ) : null}
    </div>
  )
}

function LineRow({
  item,
  currency,
  readOnly,
  products,
  canRemove,
  onChange,
  onRemove,
}: {
  item: LineItem
  currency: string
  readOnly: boolean
  products: Array<{
    id: string
    name: string
    description: string | null
    unitAmountCents: number
  }>
  canRemove: boolean
  onChange: (patch: Partial<LineItem>) => void
  onRemove: () => void
}) {
  const [price, setPrice] = useState(centsToInput(item.unitAmountCents))
  const [qty, setQty] = useState(String(item.quantity))
  const selectValue = item.productId ?? CUSTOM

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_4rem_5.5rem_5.5rem_1.75rem] items-start gap-2">
      {readOnly ? (
        <p className="truncate text-sm">{item.name.trim() || "—"}</p>
      ) : (
        <div className="min-w-0 space-y-1.5">
          <Select
            value={selectValue}
            onValueChange={(next) => {
              if (!next || next === CUSTOM) {
                onChange({ productId: null, name: item.productId ? "" : item.name })
                return
              }
              const product = products.find((entry) => entry.id === next)
              if (!product) {
                return
              }
              setPrice(centsToInput(product.unitAmountCents))
              onChange({
                productId: product.id,
                name: product.name,
                description: product.description ?? "",
                unitAmountCents: product.unitAmountCents,
              })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CUSTOM}>Custom item</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!item.productId ? (
            <Input
              value={item.name}
              placeholder="Item name"
              aria-label="Item name"
              onChange={(event) =>
                onChange({ name: event.target.value, productId: null })
              }
            />
          ) : null}
        </div>
      )}
      <Input
        key={`${item.id}-qty-${item.quantity}`}
        defaultValue={String(item.quantity)}
        disabled={readOnly}
        inputMode="decimal"
        className="text-right tabular-nums"
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
          const next = Number(qty || String(item.quantity))
          const quantity = Number.isFinite(next) && next > 0 ? next : 1
          setQty(String(quantity))
          onChange({ quantity })
        }}
      />
      <Input
        key={`${item.id}-price-${item.unitAmountCents}`}
        defaultValue={centsToInput(item.unitAmountCents)}
        disabled={readOnly}
        inputMode="decimal"
        className="text-right tabular-nums"
        aria-label="Unit price"
        onChange={(event) => {
          const next = event.target.value
          setPrice(next)
          onChange({
            productId: null,
            unitAmountCents: inputToCents(next),
          })
        }}
        onBlur={() => {
          const unitAmountCents = inputToCents(
            price || centsToInput(item.unitAmountCents)
          )
          setPrice(centsToInput(unitAmountCents))
          onChange({ unitAmountCents })
        }}
      />
      <p className="text-right text-sm tabular-nums">
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
