import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
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

import { workspaceMembersQueryOptions } from "@features/workspaces/api"

import { api } from "@lib/api"
import { fieldErrors } from "@lib/utils"
import { parseWorkspaceRole } from "@shared/workspace"

const routeApi = getRouteApi("/_authed/w/$slug/settings")

const inviteFormSchema = z.object({
  email: z.email(),
})

export function SettingsPage() {
  const { slug } = routeApi.useParams()
  const queryClient = useQueryClient()
  const { data: members } = useSuspenseQuery(workspaceMembersQueryOptions(slug))

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
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-sm text-muted-foreground">Members</h1>
        <ul className="divide-y">
          {members.members.map((member) => (
            <li
              key={member.id}
              className="flex items-baseline justify-between gap-3 py-3"
            >
              <span className="min-w-0 truncate">{member.email}</span>
              <span className="text-sm text-muted-foreground">
                {roleLabel(member.role)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          invite.reset()
          void inviteForm.handleSubmit()
        }}
      >
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
                  onChange={(event) => field.handleChange(event.target.value)}
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
    </section>
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
