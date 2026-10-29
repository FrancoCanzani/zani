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
  createCustomer,
  customersQueryOptions,
  type Customer,
} from "@features/customers/api"

const NONE = "__none__"

type CustomerFieldsProps = {
  slug: string
  readOnly?: boolean
  customerId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerTaxId: string
  onChange: (next: {
    customerId: string | null
    customerName: string
    customerPhone: string
    customerEmail: string
    customerAddress: string
    customerTaxId: string
  }) => void
}

export function CustomerFields({
  slug,
  readOnly,
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  customerTaxId,
  onChange,
}: CustomerFieldsProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [taxId, setTaxId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const { data } = useQuery({
    ...customersQueryOptions(slug),
    enabled: !readOnly,
  })
  const customers = data?.customers ?? []

  const create = useMutation({
    mutationFn: () =>
      createCustomer(slug, {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        taxId: taxId.trim() || null,
      }),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["customers", slug] })
      applyCustomer(body.customer)
      setDialogOpen(false)
      resetForm()
    },
    onError: (error) => {
      setFormError(error.message)
    },
  })

  function applyCustomer(customer: Customer) {
    onChange({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone ?? "",
      customerEmail: customer.email ?? "",
      customerAddress: customer.address ?? "",
      customerTaxId: customer.taxId ?? "",
    })
  }

  function clearCustomer() {
    onChange({
      customerId: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerTaxId: "",
    })
  }

  function resetForm() {
    setName("")
    setPhone("")
    setEmail("")
    setAddress("")
    setTaxId("")
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
          {customerName.trim() || "No customer"}
          {customerPhone || customerEmail ? (
            <span className="text-muted-foreground">
              {" "}
              · {[customerPhone, customerEmail].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </p>
        {customerAddress.trim() ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {customerAddress}
          </p>
        ) : null}
        {customerTaxId.trim() ? (
          <p className="text-sm text-muted-foreground">Tax ID {customerTaxId}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            value={customerId ?? NONE}
            onValueChange={(value) => {
              if (!value || value === NONE) {
                clearCustomer()
                return
              }
              const selected = customers.find((item) => item.id === value)
              if (selected) {
                applyCustomer(selected)
              }
            }}
          >
            <SelectTrigger
              id="customer"
              aria-label="Customer"
              className="w-full"
              size="default"
            >
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No customer</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
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

      {customerId &&
      (customerPhone || customerEmail || customerAddress || customerTaxId) ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          {customerPhone || customerEmail ? (
            <p>
              {[customerPhone, customerEmail].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {customerAddress.trim() ? (
            <p className="whitespace-pre-line">{customerAddress}</p>
          ) : null}
          {customerTaxId.trim() ? <p>Tax ID {customerTaxId}</p> : null}
        </div>
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
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Saved to this business for the next invoice.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-customer-name">Name</Label>
              <Input
                id="new-customer-name"
                value={name}
                autoFocus
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Jordan Lee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-phone">Phone</Label>
              <Input
                id="new-customer-phone"
                type="tel"
                value={phone}
                autoComplete="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-email">Email</Label>
              <Input
                id="new-customer-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-address">Address</Label>
              <Textarea
                id="new-customer-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Optional"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-tax">Tax ID</Label>
              <Input
                id="new-customer-tax"
                value={taxId}
                onChange={(event) => setTaxId(event.target.value)}
                placeholder="VAT / GST / EIN — optional"
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
                {create.isPending ? "Saving…" : "Save customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
