import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import { Textarea } from "@components/ui/textarea"

import {
  centsToInput,
  formatCents,
  inputToCents,
} from "@features/invoices/helpers"
import {
  createProduct,
  productsQueryOptions,
  type Product,
} from "@features/products/api"

const NONE = "__none__"

type ProductFieldsProps = {
  slug: string
  currency: string
  readOnly?: boolean
  productId: string | null
  onSelect: (product: Product | null) => void
}

export function ProductFields({
  slug,
  currency,
  readOnly,
  productId,
  onSelect,
}: ProductFieldsProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("0.00")
  const [formError, setFormError] = useState<string | null>(null)

  const { data } = useQuery({
    ...productsQueryOptions(slug),
    enabled: !readOnly,
  })
  const products = data?.products ?? []
  const selected = products.find((item) => item.id === productId) ?? null

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
      onSelect(body.product)
      setDialogOpen(false)
      resetForm()
    },
    onError: (error) => setFormError(error.message),
  })

  function resetForm() {
    setName("")
    setDescription("")
    setPrice("0.00")
    setFormError(null)
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!name.trim()) {
      setFormError("Enter a name.")
      return
    }
    create.mutate()
  }

  if (readOnly) {
    return (
      <div className="space-y-1">
        <p className="text-sm">
          {selected?.name ?? "Custom line"}
          {selected ? (
            <span className="text-muted-foreground">
              {" "}
              · {formatCents(selected.unitAmountCents, selected.currency)}
            </span>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            value={productId ?? NONE}
            onValueChange={(value) => {
              if (!value || value === NONE) {
                onSelect(null)
                return
              }
              const next = products.find((item) => item.id === value)
              onSelect(next ?? null)
            }}
          >
            <SelectTrigger
              id="product"
              aria-label="Product"
              className="w-full"
              size="default"
            >
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Custom line</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={() => {
            resetForm()
            setDialogOpen(true)
          }}
        >
          <PlusIcon />
          Add
        </Button>
      </div>

      {selected ? (
        <p className="text-sm text-muted-foreground">
          {formatCents(selected.unitAmountCents, selected.currency)}
          {selected.description ? ` · ${selected.description}` : null}
        </p>
      ) : null}

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
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Saved to this business for the next invoice.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-product-name">Name</Label>
              <Input
                id="new-product-name"
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder="Consulting hour"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-product-description">Description</Label>
              <Textarea
                id="new-product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-product-price">Unit price</Label>
              <Input
                id="new-product-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                onBlur={() => setPrice(centsToInput(inputToCents(price)))}
              />
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
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
