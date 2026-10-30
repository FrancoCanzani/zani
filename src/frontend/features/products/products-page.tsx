import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@components/ui/empty"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"

import { formatCents, inputToCents, centsToInput } from "@features/invoices/helpers"
import {
  archiveProduct,
  createProduct,
  productsQueryOptions,
} from "@features/products/api"
import { workspaceQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/products/")

export function ProductsPage() {
  const { slug } = routeApi.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(productsQueryOptions(slug))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const currency = workspaceData.workspace.defaultCurrency ?? "usd"

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("0.00")
  const [formError, setFormError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      createProduct(slug, {
        name: name.trim(),
        description: description.trim() || null,
        unitAmountCents: inputToCents(price),
        currency,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products", slug] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error) => setFormError(error.message),
  })

  const archive = useMutation({
    mutationFn: (productId: string) => archiveProduct(slug, productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products", slug] })
    },
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

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  const productDialog = (
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
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="Consulting hour"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-price">Unit price</Label>
            <Input
              id="product-price"
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
  )

  if (data.products.length === 0) {
    return (
      <>
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle>No products yet</EmptyTitle>
            <EmptyDescription>
              Save the services and materials you bill for so invoice lines fill
              themselves in.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={openCreate}>
              Add product
            </Button>
          </EmptyContent>
        </Empty>
        {productDialog}
      </>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Reusable line items for your invoices.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Add product
        </Button>
      </div>

      {archive.error ? (
        <p className="text-sm text-destructive" role="alert">
          {archive.error.message}
        </p>
      ) : null}

      <ul className="divide-y border-y">
        {data.products.map((product) => (
          <li
            key={product.id}
            className="flex items-start justify-between gap-4 py-4"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{product.name}</p>
              {product.description ? (
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <p className="tabular-nums text-sm">
                {formatCents(product.unitAmountCents, product.currency)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={archive.isPending}
                onClick={() => archive.mutate(product.id)}
              >
                Archive
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {productDialog}
    </div>
  )
}
