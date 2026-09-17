import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { AppShell } from "@components/app-shell"
import { NotFoundScreen } from "@components/not-found-screen"
import { PendingScreen } from "@components/pending-screen"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { api } from "@lib/api"
import { authClient } from "@lib/auth/client"
import { fieldErrors } from "@lib/utils"
import {
  workspaceMembersQueryOptions,
  workspaceQueryOptions,
  workspacesQueryOptions,
} from "@features/workspaces/api"
import { writeLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { parseWorkspaceRole } from "@shared/workspace"

const inviteFormSchema = z.object({
  email: z.email(),
})

export const Route = createFileRoute("/_authed/w/$slug")({
  pendingComponent: () => <PendingScreen label="Loading workspace…" />,
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    writeLastWorkspaceSlug(params.slug)
    await Promise.all([
      context.queryClient.query({
        ...workspaceQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...workspaceMembersQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...workspacesQueryOptions(),
        staleTime: "static",
      }),
    ])
  },
  component: WorkspacePage,
})

function WorkspacePage() {
  const { slug } = Route.useParams()
  const session = Route.useRouteContext({
    select: (context) => context.session,
  })
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: workspace } = useSuspenseQuery(workspaceQueryOptions(slug))
  const { data: members } = useSuspenseQuery(
    workspaceMembersQueryOptions(slug)
  )
  const { data: workspaces } = useSuspenseQuery(workspacesQueryOptions())

  const invite = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.workspaces[":slug"].invites.$post({
        param: { slug },
        json: { email, role: "member" },
      })

      if (response.status === 409) {
        throw new Error("That person is already a member.")
      }
      if (response.status === 403) {
        throw new Error("You cannot invite members.")
      }
      if (!response.ok) {
        throw new Error("Could not send the invite.")
      }

      return email
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "members"],
      })
    },
  })

  const inviteForm = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: inviteFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await invite.mutateAsync(value.email)
      formApi.reset()
    },
  })

  return (
    <AppShell
      nav={
        <>
          <Link
            to="/onboarding"
            className="transition-colors hover:text-foreground"
          >
            New workspace
          </Link>
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
        </>
      }
    >
      <main className="space-y-12 pb-32 pt-8">
        <section className="space-y-2">
          <p className="font-mono text-sm text-muted-foreground">
            /w/{workspace.workspace.slug}
          </p>
          <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
            {workspace.workspace.name}
          </h1>
          {workspaces.workspaces.length > 1 ? (
            <nav className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
              {workspaces.workspaces.map((item) => (
                <Link
                  key={item.id}
                  to="/w/$slug"
                  params={{ slug: item.slug }}
                  className={
                    item.slug === slug
                      ? "text-foreground"
                      : "transition-colors hover:text-foreground"
                  }
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-normal text-muted-foreground">Members</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Signed in as {session.user.email}. Invites are emailed; in
            development the link is printed in the Worker console.
          </p>
          <ul className="max-w-xl space-y-3 leading-relaxed">
            {members.members.map((member) => (
              <li
                key={member.id}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="min-w-0 truncate">{member.email}</span>
                <span className="text-sm text-muted-foreground">
                  {roleLabel(member.role)}
                </span>
              </li>
            ))}
          </ul>

          {invite.error ? (
            <p className="text-sm text-destructive" role="alert">
              {invite.error.message}
            </p>
          ) : null}
          {invite.isSuccess ? (
            <p className="text-sm text-muted-foreground">
              Invite sent to {invite.data}.
            </p>
          ) : null}

          <form
            className="max-w-md pt-2"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              invite.reset()
              void inviteForm.handleSubmit()
            }}
          >
            <FieldGroup>
              <inviteForm.Field name="email">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={field.name}>Invite email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="teammate@example.com"
                    />
                    <FieldDescription>
                      They must sign in with this email to join.
                    </FieldDescription>
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </inviteForm.Field>
              <inviteForm.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex w-fit cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-800 px-4 py-1 text-base text-white shadow-sm transition-all duration-300 disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending…" : "Send invite"}
                  </button>
                )}
              </inviteForm.Subscribe>
            </FieldGroup>
          </form>
        </section>
      </main>
    </AppShell>
  )
}

function roleLabel(role: string) {
  const parsed = parseWorkspaceRole(role)
  if (!parsed) {
    return role
  }
  switch (parsed) {
    case "owner":
      return "Owner"
    case "admin":
      return "Admin"
    case "member":
      return "Member"
    default: {
      const exhaustive: never = parsed
      return exhaustive
    }
  }
}
