import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import { toast } from "sonner"
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

import { BusinessDetailsFields } from "@features/workspaces/business-details-fields"
import {
  workspaceMembersQueryOptions,
  workspaceQueryOptions,
} from "@features/workspaces/api"
import {
  canInvite,
  canManageBusiness,
  parseWorkspaceRole,
  roleLabel,
} from "@features/workspaces/role"
import { api } from "@lib/api"
import { fieldErrors } from "@lib/utils"

const routeApi = getRouteApi("/_authed/businesses/$slug/manage")

const inviteFormSchema = z.object({
  email: z.email(),
})

export function ManagePage() {
  const { slug } = routeApi.useParams()
  const queryClient = useQueryClient()
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const { data: membersData } = useSuspenseQuery(
    workspaceMembersQueryOptions(slug)
  )

  const workspace = workspaceData.workspace
  const role = parseWorkspaceRole(workspace.role)
  const manageBusiness = role ? canManageBusiness(role) : false
  const inviteAllowed = role ? canInvite(role) : false

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
    onSuccess: async (email) => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "members"],
      })
      toast.success(`Invite sent to ${email}.`)
    },
    onError: (error) => {
      toast.error(error.message)
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Manage</h1>
        <p className="text-sm text-muted-foreground">
          Business details, people, and invites.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm text-muted-foreground">Business</h2>
        {!workspace.detailsComplete ? (
          <p className="text-sm text-muted-foreground">
            Add contact details so they show on invoices.
          </p>
        ) : null}
        {manageBusiness ? (
          <BusinessDetailsFields slug={slug} workspace={workspace} />
        ) : (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{workspace.name}</p>
            {workspace.email ? (
              <p className="text-muted-foreground">{workspace.email}</p>
            ) : null}
            {workspace.phone ? (
              <p className="text-muted-foreground">{workspace.phone}</p>
            ) : null}
            {workspace.address ? (
              <p className="whitespace-pre-line text-muted-foreground">
                {workspace.address}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-muted-foreground">People</h2>
        <ul className="divide-y border-y">
          {membersData.members.map((member) => (
            <li
              key={member.id}
              className="flex items-baseline justify-between gap-3 py-3"
            >
              <span className="min-w-0 truncate">{member.email}</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {roleLabel(member.role)}
              </span>
            </li>
          ))}
        </ul>

        {inviteAllowed ? (
          <form
            className="space-y-3"
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
                    <FieldLabel htmlFor={field.name}>Invite someone</FieldLabel>
                    <div className="flex gap-2">
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
                        className="flex-1"
                      />
                      <inviteForm.Subscribe
                        selector={(state) => state.isSubmitting}
                      >
                        {(isSubmitting) => (
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Sending…" : "Send invite"}
                          </Button>
                        )}
                      </inviteForm.Subscribe>
                    </div>
                    <FieldDescription>
                      They must sign in with this email to join.
                    </FieldDescription>
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </inviteForm.Field>
            </FieldGroup>
          </form>
        ) : null}
      </section>
    </div>
  )
}
