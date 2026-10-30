import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@components/ui/field"
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"

import {
  updateWorkspace,
  type Workspace,
} from "@features/workspaces/api"
import { fieldErrors } from "@lib/utils"

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Enter a business name.").max(80),
  email: z.string().trim().max(254),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(500),
  taxId: z.string().trim().max(80),
})

type BusinessDetailsFieldsProps = {
  slug: string
  workspace: Workspace
  showSkip?: boolean
  onSaved?: () => void
  onSkipped?: () => void
  submitLabel?: string
}

export function BusinessDetailsFields({
  slug,
  workspace,
  showSkip,
  onSaved,
  onSkipped,
  submitLabel = "Save",
}: BusinessDetailsFieldsProps) {
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: (body: {
      name: string
      email: string | null
      phone: string | null
      address: string | null
      taxId: string | null
      skipDetails?: boolean
    }) => updateWorkspace(slug, body),
    onSuccess: async (body) => {
      queryClient.setQueryData(["workspace", slug], body)
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      toast.success("Business details saved.")
      onSaved?.()
    },
    onError: (error) => toast.error(error.message),
  })

  const form = useForm({
    defaultValues: {
      name: workspace.name,
      email: workspace.email ?? "",
      phone: workspace.phone ?? "",
      address: workspace.address ?? "",
      taxId: workspace.taxId ?? "",
    },
    validators: {
      onSubmit: detailsSchema,
    },
    onSubmit: async ({ value }) => {
      await save.mutateAsync({
        name: value.name.trim(),
        email: value.email.trim() || null,
        phone: value.phone.trim() || null,
        address: value.address.trim() || null,
        taxId: value.taxId.trim() || null,
      })
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        save.reset()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>
                Business name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                maxLength={80}
              />
              <FieldError errors={fieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="hello@business.com"
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
              <Input
                id={field.name}
                type="tel"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Phone number"
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="address">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Address</FieldLabel>
              <Textarea
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Street, city, country"
                rows={3}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="taxId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Tax ID</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="VAT / GST / EIN"
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {isSubmitting || save.isPending ? "Saving…" : submitLabel}
            </Button>
          )}
        </form.Subscribe>
        {showSkip ? (
          <Button
            type="button"
            variant="ghost"
            disabled={save.isPending}
            onClick={() => {
              void save
                .mutateAsync({
                  name: workspace.name,
                  email: workspace.email,
                  phone: workspace.phone,
                  address: workspace.address,
                  taxId: workspace.taxId,
                  skipDetails: true,
                })
                .then(() => onSkipped?.())
            }}
          >
            Skip for now
          </Button>
        ) : null}
      </div>
    </form>
  )
}
