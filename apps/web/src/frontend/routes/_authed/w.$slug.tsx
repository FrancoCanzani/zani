import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { NotFoundScreen } from "@components/not-found-screen"
import { PendingScreen } from "@components/pending-screen"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { api } from "@lib/api"
import { authClient } from "@lib/auth-client"
import { fieldErrors } from "@lib/form-errors"
import { writeLastWorkspaceSlug } from "@lib/last-workspace"
import {
  workspaceMembersQueryOptions,
  workspaceQueryOptions,
  workspacesQueryOptions,
} from "@lib/queries"
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
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            /w/{workspace.workspace.slug}
          </p>
          <h1 className="font-medium">{workspace.workspace.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/onboarding">New workspace</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
      </header>

      {workspaces.workspaces.length > 1 ? (
        <nav className="flex flex-wrap gap-2 text-sm">
          {workspaces.workspaces.map((item) => (
            <Link
              key={item.id}
              to="/w/$slug"
              params={{ slug: item.slug }}
              className={
                item.slug === slug
                  ? "font-medium"
                  : "text-muted-foreground underline-offset-4 hover:underline"
              }
            >
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Signed in as {session.user.email}. Invites are emailed; in
            development the link is printed in the Worker console.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {members.members.map((member) => (
              <li
                key={member.id}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="min-w-0 truncate">{member.email}</span>
                <span className="text-muted-foreground">
                  {roleLabel(member.role)}
                </span>
              </li>
            ))}
          </ul>
          {invite.error ? (
            <Alert variant="destructive">
              <AlertDescription>{invite.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {invite.isSuccess ? (
            <Alert>
              <AlertDescription>
                Invite sent to {invite.data}.
              </AlertDescription>
            </Alert>
          ) : null}
          <form
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sending…" : "Send invite"}
                  </Button>
                )}
              </inviteForm.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
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
