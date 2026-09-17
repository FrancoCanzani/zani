import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { AppShell } from "@components/app-shell"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { api } from "@lib/api"
import { authClient } from "@lib/auth/client"
import { fieldErrors } from "@lib/utils"
import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { slugify, workspaceSlugSchema } from "@shared/workspace"

const onboardingFormSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: workspaceSlugSchema,
  invites: z.string(),
})

export const Route = createFileRoute("/_authed/onboarding")({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = Route.useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()

  const createWorkspace = useMutation({
    mutationFn: async (input: {
      name: string
      slug: string
      invites: string
    }) => {
      const invites = input.invites
        .split(/[\n,]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)

      const parsedInvites = z.array(z.email()).max(20).safeParse(invites)
      if (!parsedInvites.success) {
        throw new Error("One or more invite emails are invalid.")
      }

      const response = await api.workspaces.$post({
        json: {
          name: input.name.trim(),
          slug: input.slug,
          invites: parsedInvites.data,
        },
      })

      if (response.status === 409) {
        throw new Error("That workspace URL is taken.")
      }

      if (!response.ok) {
        throw new Error("Could not create the workspace.")
      }

      return response.json()
    },
    onSuccess: async (body) => {
      writeLastWorkspaceSlug(body.workspace.slug)
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      await navigate({
        to: "/w/$slug",
        params: { slug: body.workspace.slug },
      })
    },
  })

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      invites: "",
    },
    validators: {
      onSubmit: onboardingFormSchema,
    },
    onSubmit: async ({ value }) => {
      await createWorkspace.mutateAsync(value)
    },
  })

  return (
    <AppShell
      nav={
        <button
          type="button"
          className="transition-colors hover:text-foreground"
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
        </button>
      }
    >
      <main className="max-w-md py-16">
        <p className="text-sm text-muted-foreground italic">First step</p>
        <h1 className="mt-4 text-2xl font-normal tracking-tight sm:text-3xl">
          Create a workspace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pick a name and URL. You can invite teammates now or later.
        </p>

        {createWorkspace.error ? (
          <p className="mt-6 text-sm text-destructive" role="alert">
            {createWorkspace.error.message}
          </p>
        ) : null}

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            createWorkspace.reset()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              listeners={{
                onChange: ({ value }) => {
                  form.setFieldValue("slug", slugify(value))
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Acme"
                  />
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Field name="slug">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>URL</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="acme"
                  />
                  <FieldDescription>
                    {field.state.value
                      ? `/w/${field.state.value}`
                      : "Shown in the address bar as /w/your-workspace"}
                  </FieldDescription>
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Field name="invites">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Invite members</FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="teammate@example.com"
                  />
                  <FieldDescription>
                    Optional. One email per line. They get a link to join.
                  </FieldDescription>
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex w-fit cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-800 px-4 py-1 text-base text-white shadow-sm transition-all duration-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating…" : "Create workspace"}
                </button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </main>
    </AppShell>
  )
}
