import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Textarea } from "@components/ui/textarea"

import {
  createCustomer,
  customersQueryOptions,
  type Customer,
} from "@features/customers/api"
import type { BillTo } from "@features/invoices/invoice-draft"

const emptyBillTo: BillTo = {
  customerId: null,
  name: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
}

function billToFromCustomer(customer: Customer): BillTo {
  return {
    customerId: customer.id,
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    taxId: customer.taxId ?? "",
  }
}

export function EditorCustomerSection({
  slug,
  value,
  onChange,
}: {
  slug: string
  value: BillTo
  onChange: (next: BillTo) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState<string | null>(null)
  const { data } = useQuery(customersQueryOptions(slug))
  const customers = data?.customers ?? []
  const hasCustomer = value.name.trim().length > 0

  function openCreate() {
    setPickerOpen(false)
    setCreating(search.trim())
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium">Customer</h2>

      {hasCustomer ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-4">
          <div className="min-w-0 space-y-0.5 text-sm">
            <p className="font-medium">{value.name}</p>
            {[value.email, value.phone, value.address]
              .filter((line) => line.trim())
              .map((line) => (
                <p
                  key={line}
                  className="whitespace-pre-line text-muted-foreground"
                >
                  {line}
                </p>
              ))}
            {!value.email.trim() ? (
              <p className="text-muted-foreground">No email on file</p>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Customer options"
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  onChange(emptyBillTo)
                  setPickerOpen(true)
                }}
              >
                Change customer
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onChange(emptyBillTo)}
              >
                Remove customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Popover
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open)
            if (!open) setSearch("")
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="w-full justify-start font-normal text-muted-foreground"
            >
              <SearchIcon />
              Find or add a customer…
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-(--radix-popover-trigger-width) p-0"
          >
            <Command>
              <CommandInput
                placeholder="Find or add a customer…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>
                {customers.length > 0 ? (
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.email ?? ""} ${customer.id}`}
                        onSelect={() => {
                          onChange(billToFromCustomer(customer))
                          setPickerOpen(false)
                          setSearch("")
                        }}
                      >
                        <span className="truncate">{customer.name}</span>
                        {customer.email ? (
                          <span className="ml-auto truncate text-xs text-muted-foreground">
                            {customer.email}
                          </span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                <CommandSeparator alwaysRender />
                <CommandGroup forceMount>
                  <CommandItem forceMount value="__new__" onSelect={openCreate}>
                    <PlusIcon />
                    {search.trim()
                      ? `Add “${search.trim()}” as a new customer`
                      : "Add new customer"}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <NewCustomerDialog
        slug={slug}
        initialName={creating}
        onClose={() => setCreating(null)}
        onCreated={(customer) => {
          onChange(billToFromCustomer(customer))
          setCreating(null)
        }}
      />
    </section>
  )
}

function NewCustomerDialog({
  slug,
  initialName,
  onClose,
  onCreated,
}: {
  slug: string
  initialName: string | null
  onClose: () => void
  onCreated: (customer: Customer) => void
}) {
  const open = initialName !== null
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        {open ? (
          <NewCustomerForm
            slug={slug}
            initialName={initialName}
            onCancel={onClose}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NewCustomerForm({
  slug,
  initialName,
  onCancel,
  onCreated,
}: {
  slug: string
  initialName: string
  onCancel: () => void
  onCreated: (customer: Customer) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [taxId, setTaxId] = useState("")

  const create = useMutation({
    mutationFn: () =>
      createCustomer(slug, {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        taxId: taxId.trim() || null,
      }),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["customers", slug] })
      onCreated(body.customer)
    },
  })

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim()) create.mutate()
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>Add customer</DialogTitle>
        <DialogDescription>
          Saved to this business so you can bill them again.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="new-customer-name">Name</FieldLabel>
          <Input
            id="new-customer-name"
            value={name}
            autoFocus
            required
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-customer-email">Email</FieldLabel>
          <Input
            id="new-customer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="new-customer-phone">Phone</FieldLabel>
            <Input
              id="new-customer-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-customer-tax">Tax ID</FieldLabel>
            <Input
              id="new-customer-tax"
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="new-customer-address">Address</FieldLabel>
          <Textarea
            id="new-customer-address"
            value={address}
            rows={2}
            onChange={(event) => setAddress(event.target.value)}
          />
        </Field>
      </FieldGroup>
      {create.error ? (
        <p className="text-sm text-destructive" role="alert">
          {create.error.message}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="default" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add customer"}
        </Button>
      </DialogFooter>
    </form>
  )
}
