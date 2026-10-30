import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { Button } from "@components/ui/button"
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
const NEW = "__new__"

export function InvoiceBillTo({
  slug,
  readOnly,
  value,
  onChange,
}: InvoiceBillToProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<"pick" | "new">(
    value.customerId || value.customerName.trim() ? "pick" : "pick"
  )
  const { data } = useQuery({
    ...customersQueryOptions(slug),
    enabled: !readOnly,
  })
  const customers = data?.customers ?? []
  const hasCustomer = value.customerName.trim().length > 0
  const showingNew = mode === "new" && !value.customerId

  const create = useMutation({
    mutationFn: () =>
      createCustomer(slug, {
        name: value.customerName.trim(),
        phone: value.customerPhone.trim() || null,
        email: value.customerEmail.trim() || null,
        address: value.customerAddress.trim() || null,
        taxId: value.customerTaxId.trim() || null,
      }),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["customers", slug] })
      applyCustomer(body.customer)
      setMode("pick")
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

  function patch(partial: Partial<BillToSnapshot>) {
    onChange({
      ...value,
      customerId: partial.customerId !== undefined ? partial.customerId : null,
      ...partial,
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
    setMode("pick")
  }

  if (readOnly) {
    return (
      <div className="min-w-0 space-y-1.5">
        <p className="text-xs text-muted-foreground">Bill to</p>
        {hasCustomer ? (
          <div className="space-y-0.5 text-sm">
            <p className="font-medium">{value.customerName}</p>
            {value.customerEmail.trim() ? (
              <p className="text-muted-foreground">{value.customerEmail}</p>
            ) : null}
            {value.customerPhone.trim() ? (
              <p className="text-muted-foreground">{value.customerPhone}</p>
            ) : null}
            {value.customerAddress.trim() ? (
              <p className="whitespace-pre-line text-muted-foreground">
                {value.customerAddress}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No customer</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Bill to</p>
        {hasCustomer || showingNew ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-5 px-1.5 text-xs text-muted-foreground"
            onClick={clear}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {!showingNew && !hasCustomer ? (
        <div className="space-y-2">
          <Select
            value={NONE}
            onValueChange={(next) => {
              if (!next || next === NONE) {
                return
              }
              if (next === NEW) {
                setMode("new")
                onChange({
                  customerId: null,
                  customerName: "",
                  customerPhone: "",
                  customerEmail: "",
                  customerAddress: "",
                  customerTaxId: "",
                })
                return
              }
              const selected = customers.find((item) => item.id === next)
              if (selected) {
                applyCustomer(selected)
                setMode("pick")
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select a customer</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
              <SelectItem value={NEW}>Set up a new customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {hasCustomer && value.customerId ? (
        <Select
          value={value.customerId}
          onValueChange={(next) => {
            if (!next) {
              return
            }
            if (next === NEW) {
              clear()
              setMode("new")
              return
            }
            const selected = customers.find((item) => item.id === next)
            if (selected) {
              applyCustomer(selected)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
            <SelectItem value={NEW}>Set up a new customer</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {showingNew || (hasCustomer && !value.customerId) ? (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bill-to-name"
              value={value.customerName}
              onChange={(event) =>
                patch({ customerName: event.target.value, customerId: null })
              }
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-email">Email</Label>
            <Input
              id="bill-to-email"
              type="email"
              value={value.customerEmail}
              onChange={(event) =>
                patch({ customerEmail: event.target.value, customerId: null })
              }
              placeholder="client@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-phone">Phone</Label>
            <Input
              id="bill-to-phone"
              type="tel"
              value={value.customerPhone}
              onChange={(event) =>
                patch({ customerPhone: event.target.value, customerId: null })
              }
              placeholder="Phone number"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-to-address">Address</Label>
            <Textarea
              id="bill-to-address"
              value={value.customerAddress}
              onChange={(event) =>
                patch({ customerAddress: event.target.value, customerId: null })
              }
              placeholder="Street, city, country"
              rows={2}
            />
          </div>
          {value.customerName.trim() ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving…" : "Save customer"}
            </Button>
          ) : null}
          {create.error ? (
            <p className="text-sm text-destructive" role="alert">
              {create.error.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasCustomer && value.customerId ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          {value.customerEmail.trim() ? <p>{value.customerEmail}</p> : null}
          {value.customerPhone.trim() ? <p>{value.customerPhone}</p> : null}
          {value.customerAddress.trim() ? (
            <p className="whitespace-pre-line">{value.customerAddress}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
