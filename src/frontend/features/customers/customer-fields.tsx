import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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

const NONE = "__none__"

type CustomerSnapshot = {
  customerId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerTaxId: string
}

type CustomerFieldsProps = {
  slug: string
  readOnly?: boolean
  customerId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerTaxId: string
  onChange: (next: CustomerSnapshot) => void
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

  const { data } = useQuery({
    ...customersQueryOptions(slug),
    enabled: !readOnly,
  })
  const customers = data?.customers ?? []

  const create = useMutation({
    mutationFn: () =>
      createCustomer(slug, {
        name: customerName.trim(),
        phone: customerPhone.trim() || null,
        email: customerEmail.trim() || null,
        address: customerAddress.trim() || null,
        taxId: customerTaxId.trim() || null,
      }),
    onSuccess: async (body) => {
      await queryClient.invalidateQueries({ queryKey: ["customers", slug] })
      applyCustomer(body.customer)
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

  function patch(
    partial: Omit<Partial<CustomerSnapshot>, "customerId">
  ) {
    onChange({
      customerId: null,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerTaxId,
      ...partial,
    })
  }

  const canSaveCustomer =
    !readOnly && !customerId && customerName.trim().length > 0

  if (readOnly) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Name</p>
          <p className="mt-0.5">{customerName.trim() || "—"}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="mt-0.5">{customerEmail.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="mt-0.5">{customerPhone.trim() || "—"}</p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Address</p>
          <p className="mt-0.5 whitespace-pre-line">
            {customerAddress.trim() || "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Tax ID</p>
          <p className="mt-0.5">{customerTaxId.trim() || "—"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Saved customer</Label>
        <Select
          value={customerId ?? NONE}
          onValueChange={(value) => {
            if (!value || value === NONE) {
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
            const selected = customers.find((item) => item.id === value)
            if (selected) {
              applyCustomer(selected)
            }
          }}
        >
          <SelectTrigger id="customer" className="h-8 w-full py-0" size="sm">
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None, type below</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bill-to-name">Name</Label>
        <Input
          id="bill-to-name"
          value={customerName}
          autoComplete="organization"
          onChange={(event) => patch({ customerName: event.target.value })}
          placeholder="John Doe"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bill-to-email">
            Email{" "}
            <span className="font-normal text-muted-foreground">Optional</span>
          </Label>
          <Input
            id="bill-to-email"
            type="email"
            value={customerEmail}
            autoComplete="email"
            onChange={(event) => patch({ customerEmail: event.target.value })}
            placeholder="client@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bill-to-phone">
            Phone{" "}
            <span className="font-normal text-muted-foreground">Optional</span>
          </Label>
          <Input
            id="bill-to-phone"
            type="tel"
            value={customerPhone}
            autoComplete="tel"
            onChange={(event) => patch({ customerPhone: event.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bill-to-address">
          Address{" "}
          <span className="font-normal text-muted-foreground">Optional</span>
        </Label>
        <Textarea
          id="bill-to-address"
          value={customerAddress}
          onChange={(event) => patch({ customerAddress: event.target.value })}
          placeholder="456 Client St, City, Country"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bill-to-tax">
          Tax ID{" "}
          <span className="font-normal text-muted-foreground">Optional</span>
        </Label>
        <Input
          id="bill-to-tax"
          value={customerTaxId}
          onChange={(event) => patch({ customerTaxId: event.target.value })}
          placeholder="VAT / GST / EIN"
        />
      </div>

      {canSaveCustomer ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Save this customer for the next invoice.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save customer"}
          </Button>
        </div>
      ) : null}

      {create.error ? (
        <p className="text-sm text-destructive" role="alert">
          {create.error.message}
        </p>
      ) : null}
    </div>
  )
}
