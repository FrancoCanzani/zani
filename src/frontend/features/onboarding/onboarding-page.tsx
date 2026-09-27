import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { PlusIcon, XIcon } from "lucide-react"
import { z } from "zod"

import { Button } from "@components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@components/ui/field"
import { Input } from "@components/ui/input"

import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { api } from "@lib/api"
import { authClient } from "@lib/auth/client"
import { fieldErrors } from "@lib/utils"
import { slugify, workspaceSlugSchema } from "@shared/workspace"

const MAX_INVITES = 20

const inviteEntrySchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || z.email().safeParse(value).success,
    "Enter a valid email."
  )

const onboardingFormSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: workspaceSlugSchema,
  invites: z
    .array(inviteEntrySchema)
    .max(MAX_INVITES)
    .superRefine((values, ctx) => {
      const seen = new Set<string>()
      for (const [index, value] of values.entries()) {
        const email = value.toLowerCase()
        if (!email) {
          continue
        }
        if (seen.has(email)) {
          ctx.addIssue({
            code: "custom",
            message: "Already added.",
            path: [index],
          })
          continue
        }
        seen.add(email)
      }
    }),
})

function focusInvite(index: number) {
  requestAnimationFrame(() => {
    document.getElementById(`invites-${index}`)?.focus()
  })
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()

  const createWorkspace = useMutation({
    mutationFn: async (input: {
      name: string
      slug: string
      invites: string[]
    }) => {
      const invites = input.invites
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)

      const response = await api.workspaces.$post({
        json: {
          name: input.name.trim(),
          slug: input.slug,
          invites,
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
      invites: [""],
    },
    validators: {
      onSubmit: onboardingFormSchema,
    },
    onSubmit: async ({ value }) => {
      await createWorkspace.mutateAsync(value)
    },
  })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground italic">First step</p>
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
                {field.state.value ? (
                  <FieldDescription>/w/{field.state.value}</FieldDescription>
                ) : null}
                <FieldError errors={fieldErrors(field.state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="invites" mode="array">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="invites-0">Invite members</FieldLabel>
                <div className="flex flex-col gap-2">
                  {field.state.value.map((_, index) => (
                    <form.Field
                      key={index}
                      name={`invites[${index}]`}
                      validators={{
                        onBlur: inviteEntrySchema,
                      }}
                    >
                      {(invite) => {
                        const isLast = index === field.state.value.length - 1
                        const canRemove = field.state.value.length > 1

                        return (
                          <div className="flex items-start gap-1.5">
                            <Field
                              className="w-auto min-w-0 flex-1 gap-1"
                              data-invalid={invite.state.meta.errors.length > 0}
                            >
                              <Input
                                id={`invites-${index}`}
                                name={invite.name}
                                type="email"
                                autoComplete="off"
                                value={invite.state.value}
                                onBlur={invite.handleBlur}
                                onChange={(event) =>
                                  invite.handleChange(event.target.value)
                                }
                                placeholder="teammate@example.com"
                                aria-invalid={
                                  invite.state.meta.errors.length > 0
                                }
                              />
                              <FieldError
                                errors={fieldErrors(invite.state.meta.errors)}
                              />
                            </Field>
                            {canRemove ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove email"
                                onClick={() => field.removeValue(index)}
                              >
                                <XIcon />
                              </Button>
                            ) : null}
                            {isLast ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Add email"
                                disabled={
                                  field.state.value.length >= MAX_INVITES
                                }
                                onClick={() => {
                                  const lastIndex = field.state.value.length - 1
                                  const last =
                                    field.state.value[lastIndex] ?? ""
                                  if (!last.trim()) {
                                    focusInvite(lastIndex)
                                    return
                                  }
                                  const nextIndex = field.state.value.length
                                  field.pushValue("")
                                  focusInvite(nextIndex)
                                }}
                              >
                                <PlusIcon />
                              </Button>
                            ) : null}
                          </div>
                        )
                      }}
                    </form.Field>
                  ))}
                </div>
                <FieldDescription>
                  Optional. They get a link to join.
                </FieldDescription>
              </Field>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create workspace"}
              </Button>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </main>
  )
}
