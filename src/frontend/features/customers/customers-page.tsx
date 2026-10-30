import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import { useDeferredValue, useMemo, useState, type SubmitEvent } from "react"

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

import {
  createCustomer,
  customersQueryOptions,
  updateCustomer,
  type Customer,
} from "@features/customers/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/customers/")

type FormState = {
  name: string
  email: string
  phone: string
  address: string
  taxId: string
  notes: string
}

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
  notes: "",
}

function customerToForm(customer: Customer): FormState {
  return {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    taxId: customer.taxId ?? "",
    notes: customer.notes ?? "",
  }
}

function formToInput(form: FormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    taxId: form.taxId.trim() || null,
    notes: form.notes.trim() || null,
  }
}

export function CustomersPage() {
  const { slug } = routeApi.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(customersQueryOptions(slug))

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!deferredSearch) {
      return data.customers
    }
    return data.customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.email,
        customer.phone,
        customer.taxId,
        customer.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(deferredSearch)
    })
  }, [data.customers, deferredSearch])

  const save = useMutation({
    mutationFn: async () => {
      const body = formToInput(form)
      if (editing) {
        return updateCustomer(slug, editing.id, body)
      }
      return createCustomer(slug, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers", slug] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error) => setFormError(error.message),
  })

  function resetForm() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
  }

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    setForm(customerToForm(customer))
    setFormError(null)
    setDialogOpen(true)
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!form.name.trim()) {
      setFormError("Enter a name.")
      return
    }
    save.mutate()
  }

  function patchForm(partial: Partial<FormState>) {
    setForm((current) => ({ ...current, ...partial }))
  }

  const customerDialog = (
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
            {editing ? "Edit customer" : "Add customer"}
          </DialogTitle>
          <DialogDescription>
            Saved to this business for the next invoice.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="customer-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={form.name}
              autoFocus
              onChange={(event) => patchForm({ name: event.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(event) => patchForm({ email: event.target.value })}
                placeholder="client@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => patchForm({ phone: event.target.value })}
                placeholder="Phone number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">Address</Label>
            <Textarea
              id="customer-address"
              value={form.address}
              onChange={(event) => patchForm({ address: event.target.value })}
              placeholder="456 Client St, City, Country"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-tax">Tax ID</Label>
            <Input
              id="customer-tax"
              value={form.taxId}
              onChange={(event) => patchForm({ taxId: event.target.value })}
              placeholder="VAT / GST / EIN"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-notes">Notes</Label>
            <Textarea
              id="customer-notes"
              value={form.notes}
              onChange={(event) => patchForm({ notes: event.target.value })}
              placeholder="Anything useful for the next invoice"
              rows={2}
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
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Save customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  if (data.customers.length === 0) {
    return (
      <>
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle>No customers yet</EmptyTitle>
            <EmptyDescription>
              Keep the people you bill in one place so invoices fill themselves
              in.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={openCreate}>
              Add customer
            </Button>
          </EmptyContent>
        </Empty>
        {customerDialog}
      </>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            A simple list of who you invoice.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Add customer
        </Button>
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, phone…"
        aria-label="Search customers"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customers match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Phone</th>
                <th className="pb-3 font-medium">Tax ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="group cursor-pointer"
                  onClick={() => openEdit(customer)}
                >
                  <td className="py-3.5 pr-4 font-medium transition-colors group-hover:text-muted-foreground">
                    {customer.name}
                  </td>
                  <td className="max-w-[14rem] truncate py-3.5 pr-4 text-muted-foreground">
                    {customer.email?.trim() || "—"}
                  </td>
                  <td className="py-3.5 pr-4 tabular-nums text-muted-foreground">
                    {customer.phone?.trim() || "—"}
                  </td>
                  <td className="py-3.5 text-muted-foreground">
                    {customer.taxId?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {customerDialog}
    </div>
  )
}
