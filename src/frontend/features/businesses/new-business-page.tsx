import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { z } from "zod"

import { BrandMark } from "@components/brand-mark"
import { Button } from "@components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@components/ui/field"
import { Input } from "@components/ui/input"

import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { api } from "@lib/api"
import { fieldErrors } from "@lib/utils"

const businessSchema = z.object({
  name: z.string().trim().min(1, "Enter a business name.").max(80),
})

export function NewBusinessPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createBusiness = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.workspaces.$post({
        json: { name },
      })

      if (!response.ok) {
        throw new Error("Could not create the business.")
      }

      return response.json()
    },
    onSuccess: async (body) => {
      writeLastWorkspaceSlug(body.workspace.slug)
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      await navigate({
        to: "/businesses/$slug/setup",
        params: { slug: body.workspace.slug },
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: businessSchema,
    },
    onSubmit: async ({ value }) => {
      await createBusiness.mutateAsync(value.name.trim())
    },
  })

  return (
    <div className="flex min-h-svh flex-col">
      <header className="px-5">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center">
          <BrandMark to="/businesses" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <Link
          to="/businesses"
          className="mb-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </Link>
        <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
          Set up your business
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This name shows on invoices you send.
        </p>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            createBusiness.reset()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Business name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="organization"
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Rivera Plumbing"
                  />
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Continue"}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </main>
    </div>
  )
}
