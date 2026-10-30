import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import {
  paperInputClass,
  paperSelectTriggerClass,
} from "@features/invoices/paper-field"

export type BillToSnapshot = {
  customerId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerTaxId: string
}

type InvoiceBillToProps = {
  slug: string
  readOnly: boolean
  value: BillToSnapshot
  onChange: (next: BillToSnapshot) => void
}

const NONE = "__none__"
const MANUAL = "__manual__"

type Draft = {
  name: string
  email: string
  phone: string
  address: string
  taxId: string
}

const emptyDraft: Draft = {
  name: "",
  email: "",
  phone: "",
  address: "",
  taxId: "",
}

function ContactLines({
  email,
  phone,
  address,
  taxId,
}: {
  email: string
  phone: string
  address: string
  taxId: string
}) {
  return (
    <>
      {email.trim() ? (
        <p className="text-muted-foreground">{email}</p>
      ) : null}
      {phone.trim() ? (
        <p className="text-muted-foreground">{phone}</p>
      ) : null}
      {address.trim() ? (
        <p className="whitespace-pre-line text-muted-foreground">{address}</p>
      ) : null}
      {taxId.trim() ? (
        <p className="text-muted-foreground">Tax ID {taxId}</p>
      ) : null}
    </>
  )
}

export function InvoiceBillTo({
  slug,
  readOnly,
  value,
  onChange,
}: InvoiceBillToProps) {
  const queryClient = useQueryClient()
  const [manual, setManual] = useState(
    Boolean(value.customerName.trim()) && !value.customerId
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [formError, setFormError] = useState<string | null>(null)

  const { data } = useQuery({
    ...customersQueryOptions(slug),
    enabled: !readOnly,
  })
  const customers = data?.customers ?? []
  const hasCustomer = value.customerName.trim().length > 0

  const create = useMutation({
    mutationFn: () =>
      createCustomer(slug, {
        name: draft.name.trim(),
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        taxId: draft.taxId.trim() || null,
      }),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["customers", slug] })
      applyCustomer(body.customer)
      setManual(false)
      setDialogOpen(false)
      setDraft(emptyDraft)
      setFormError(null)
    },
    onError: (error) => setFormError(error.message),
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

  function clear() {
    onChange({
      customerId: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerTaxId: "",
    })
    setManual(false)
  }

  function enterManually() {
    setManual(true)
    onChange({
      customerId: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerTaxId: "",
    })
  }

  function openNewCustomer() {
    setDraft(emptyDraft)
    setFormError(null)
    setDialogOpen(true)
  }

  function onDialogSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!draft.name.trim()) {
      setFormError("Enter a name.")
      return
    }
    create.mutate()
  }

  if (readOnly) {
    return (
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] leading-5 text-muted-foreground">Bill to</p>
        {hasCustomer ? (
          <div className="space-y-0.5 text-sm leading-5">
            <p className="leading-5">{value.customerName}</p>
            <ContactLines
              email={value.customerEmail}
              phone={value.customerPhone}
              address={value.customerAddress}
              taxId={value.customerTaxId}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No customer</p>
        )}
      </div>
    )
  }

  const selectValue = value.customerId ?? (manual ? MANUAL : NONE)

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex h-5 items-center justify-between gap-2">
        <p className="text-[11px] leading-5 text-muted-foreground">Bill to</p>
        {!manual && !hasCustomer ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-5 px-0 text-[11px] text-muted-foreground"
            onClick={openNewCustomer}
          >
            New customer
          </Button>
        ) : null}
      </div>

      <div className="space-y-0.5 text-sm leading-5">
        <Select
          value={selectValue}
          onValueChange={(next) => {
            if (!next || next === NONE) {
              clear()
              return
            }
            if (next === MANUAL) {
              enterManually()
              return
            }
            const selected = customers.find((item) => item.id === next)
            if (selected) {
              applyCustomer(selected)
              setManual(false)
            }
          }}
        >
          <SelectTrigger
            className={`${paperSelectTriggerClass} m-0 w-fit max-w-full`}
          >
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Select a customer</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
            <SelectItem value={MANUAL}>Enter manually</SelectItem>
          </SelectContent>
        </Select>

        {manual ? (
          <>
            <Input
              id="bill-to-name"
              value={value.customerName}
              className={paperInputClass}
              onChange={(event) =>
                onChange({
                  ...value,
                  customerId: null,
                  customerName: event.target.value,
                })
              }
              placeholder="Name"
              aria-label="Customer name"
            />
            <Input
              id="bill-to-email"
              type="email"
              value={value.customerEmail}
              className={paperInputClass}
              onChange={(event) =>
                onChange({
                  ...value,
                  customerId: null,
                  customerEmail: event.target.value,
                })
              }
              placeholder="Email"
              aria-label="Customer email"
            />
            <Input
              id="bill-to-phone"
              type="tel"
              value={value.customerPhone}
              className={paperInputClass}
              onChange={(event) =>
                onChange({
                  ...value,
                  customerId: null,
                  customerPhone: event.target.value,
                })
              }
              placeholder="Phone"
              aria-label="Customer phone"
            />
            <Textarea
              id="bill-to-address"
              value={value.customerAddress}
              className={`${paperInputClass} min-h-[2.5rem] resize-none`}
              onChange={(event) =>
                onChange({
                  ...value,
                  customerId: null,
                  customerAddress: event.target.value,
                })
              }
              placeholder="Address"
              rows={2}
              aria-label="Customer address"
            />
            <Input
              id="bill-to-tax"
              value={value.customerTaxId}
              className={paperInputClass}
              onChange={(event) =>
                onChange({
                  ...value,
                  customerId: null,
                  customerTaxId: event.target.value,
                })
              }
              placeholder="Tax ID"
              aria-label="Customer tax ID"
            />
          </>
        ) : null}

        {!manual && hasCustomer && value.customerId ? (
          <ContactLines
            email={value.customerEmail}
            phone={value.customerPhone}
            address={value.customerAddress}
            taxId={value.customerTaxId}
          />
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setDraft(emptyDraft)
            setFormError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>
              Saved to this business for the next invoice.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={onDialogSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-customer-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-customer-name"
                value={draft.name}
                autoFocus
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-customer-email">Email</Label>
                <Input
                  id="new-customer-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="client@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-customer-phone">Phone</Label>
                <Input
                  id="new-customer-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-address">Address</Label>
              <Textarea
                id="new-customer-address"
                value={draft.address}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Street, city, country"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-tax">Tax ID</Label>
              <Input
                id="new-customer-tax"
                value={draft.taxId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    taxId: event.target.value,
                  }))
                }
                placeholder="VAT / GST / EIN"
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
