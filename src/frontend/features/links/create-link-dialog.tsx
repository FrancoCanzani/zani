import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { z } from "zod"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Button } from "@components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"

import { api } from "@lib/api"
import { fieldErrors } from "@lib/utils"

const createLinkSchema = z.object({
  destinationUrl: z.url(),
  name: z.string().trim().max(80),
})

export function CreateLinkDialog({ slug }: { slug: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const create = useMutation({
    mutationFn: async (value: z.infer<typeof createLinkSchema>) => {
      const response = await api.workspaces[":slug"].links.$post({
        param: { slug },
        json: {
          destinationUrl: value.destinationUrl,
          name: value.name.length > 0 ? value.name : undefined,
        },
      })
      if (!response.ok) {
        throw new Error("Could not create the link.")
      }
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links", slug] })
      setOpen(false)
    },
  })

  const form = useForm({
    defaultValues: {
      destinationUrl: "",
      name: "",
    },
    validators: {
      onSubmit: createLinkSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await create.mutateAsync(value)
      formApi.reset()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        New link
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New link</DialogTitle>
          <DialogDescription>
            A short code is created for this destination.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            create.reset()
            void form.handleSubmit()
          }}
        >
          {create.error ? (
            <p className="text-sm text-destructive" role="alert">
              {create.error.message}
            </p>
          ) : null}
          <FieldGroup>
            <form.Field name="destinationUrl">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Destination</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Optional"
                  />
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="border-neutral-900 bg-neutral-800 text-white shadow-sm hover:bg-neutral-800"
                >
                  {isSubmitting ? "Creating…" : "Create link"}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
