import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { z } from "zod"

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
import { authClient } from "@lib/auth/client"
import { fieldErrors } from "@lib/utils"

const businessSchema = z.object({
  name: z.string().trim().min(1, "Enter a business name.").max(80),
})

export function NewBusinessPage() {
  const navigate = useNavigate()
  const router = useRouter()
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
        to: "/businesses/$slug",
        params: { slug: body.workspace.slug },
      })
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
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/businesses"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </Link>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            void authClient.signOut({
              fetchOptions: {
                onSuccess: async () => {
                  queryClient.clear()
                  await router.invalidate()
                  await router.navigate({ to: "/sign-in" })
                },
              },
            })
          }}
        >
          Sign out
        </Button>
      </div>
      <h1 className="mt-4 text-2xl font-normal tracking-tight sm:text-3xl">
        Set up your business
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This name shows on invoices you send.
      </p>

      {createBusiness.error ? (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {createBusiness.error.message}
        </p>
      ) : null}

      <form
        className={createBusiness.error ? "mt-4" : "mt-8"}
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
  )
}
