import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@components/ui/field"
import { Input } from "@components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"

import { fieldErrors } from "@lib/utils"

import {
  cancelInvite,
  removeMember,
  sendInvite,
  updateMemberRole,
  workspaceInvitesQueryOptions,
  workspaceMembersQueryOptions,
  workspaceQueryOptions,
  type WorkspaceInvite,
} from "./api"
import {
  canInvite,
  canRemoveMember,
  canSetMemberRole,
  parseWorkspaceRole,
  roleLabel,
  type WorkspaceRole,
} from "./role"

const inviteFormSchema = z.object({
  email: z.email(),
  role: z.enum(["member", "admin"]),
})

type InviteRole = "member" | "admin"

type Confirm =
  | { kind: "remove"; memberId: string; email: string }
  | { kind: "leave"; memberId: string }

function inviteRole(value: string): InviteRole | null {
  const parsed = parseWorkspaceRole(value)
  switch (parsed) {
    case "admin":
    case "member":
      return parsed
    case "owner":
    case null:
      return null
    default: {
      const exhaustive: never = parsed
      return exhaustive
    }
  }
}

export function PeoplePanel({ slug, email }: { slug: string; email: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const { data: membersData } = useSuspenseQuery(
    workspaceMembersQueryOptions(slug)
  )
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const actor = parseWorkspaceRole(workspaceData.workspace.role)
  const inviteAllowed = actor ? canInvite(actor) : false
  const ownerCount = membersData.members.filter(
    (member) => member.role === "owner"
  ).length

  const updateRole = useMutation({
    mutationFn: (input: { memberId: string; role: InviteRole }) =>
      updateMemberRole(slug, input.memberId, input.role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "members"],
      })
      toast.success("Role updated.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(slug, memberId),
    onSuccess: async (_result, memberId) => {
      const leaving = membersData.members.some(
        (member) =>
          member.id === memberId &&
          member.email.toLowerCase() === email.toLowerCase()
      )
      setConfirm(null)
      if (leaving) {
        queryClient.removeQueries({ queryKey: ["workspace", slug] })
        await router.navigate({ to: "/businesses" })
        await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
        await queryClient.invalidateQueries({ queryKey: ["account-sites"] })
        toast.success("You left.")
        return
      }
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "members"],
      })
      toast.success("Removed.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <section className="space-y-3">
      <h2 className="text-sm text-muted-foreground">People</h2>
      <ul className="divide-y border-y">
        {membersData.members.map((member) => {
          const target = parseWorkspaceRole(member.role)
          const isSelf = member.email.toLowerCase() === email.toLowerCase()
          const displayName = member.name.trim()
          const showEmail =
            displayName.length > 0 &&
            displayName.toLowerCase() !== member.email.toLowerCase()
          const canChange = Boolean(
            actor && target && canSetMemberRole(actor, target)
          )
          const canRemove = Boolean(
            actor &&
            target &&
            canRemoveMember(actor, target, isSelf, ownerCount)
          )
          const pendingRole =
            updateRole.isPending && updateRole.variables?.memberId === member.id
              ? updateRole.variables.role
              : null
          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="truncate">{displayName || member.email}</div>
                {showEmail ? (
                  <div className="truncate text-sm text-muted-foreground">
                    {member.email}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canChange && target ? (
                  <MemberRoleSelect
                    email={member.email}
                    role={pendingRole ?? target}
                    disabled={updateRole.isPending}
                    onChange={(role) => {
                      updateRole.mutate({ memberId: member.id, role })
                    }}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {roleLabel(member.role)}
                  </span>
                )}
                {canRemove ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => {
                      setConfirm(
                        isSelf
                          ? { kind: "leave", memberId: member.id }
                          : {
                              kind: "remove",
                              memberId: member.id,
                              email: member.email,
                            }
                      )
                    }}
                  >
                    {isSelf ? "Leave" : "Remove"}
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {inviteAllowed ? <PendingInvites slug={slug} /> : null}
      {inviteAllowed ? <InviteForm slug={slug} /> : null}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <MemberConfirm
            confirm={confirm}
            pending={remove.isPending}
            onConfirm={() => {
              if (!confirm) return
              remove.mutate(confirm.memberId)
            }}
          />
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function MemberRoleSelect({
  email,
  role,
  disabled,
  onChange,
}: {
  email: string
  role: WorkspaceRole
  disabled: boolean
  onChange: (role: InviteRole) => void
}) {
  const value = role === "admin" || role === "member" ? role : "member"
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const parsed = inviteRole(next)
        if (parsed) onChange(parsed)
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-28"
        aria-label={`Role for ${email}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="member">Member</SelectItem>
      </SelectContent>
    </Select>
  )
}

function MemberConfirm({
  confirm,
  pending,
  onConfirm,
}: {
  confirm: Confirm | null
  pending: boolean
  onConfirm: () => void
}) {
  if (!confirm) return null
  switch (confirm.kind) {
    case "remove":
      return (
        <>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirm.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to these sites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </>
      )
    case "leave":
      return (
        <>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave?</AlertDialogTitle>
            <AlertDialogDescription>
              You lose access to these sites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Leaving…" : "Leave"}
            </Button>
          </AlertDialogFooter>
        </>
      )
    default: {
      const exhaustive: never = confirm
      return exhaustive
    }
  }
}

function PendingInvites({ slug }: { slug: string }) {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(workspaceInvitesQueryOptions(slug))
  const [confirm, setConfirm] = useState<WorkspaceInvite | null>(null)
  const [now] = useState(() => Date.now())

  const resend = useMutation({
    mutationFn: (invite: WorkspaceInvite) => {
      const role = inviteRole(invite.role)
      if (!role) {
        throw new Error("Could not send the invite.")
      }
      return sendInvite(slug, { email: invite.email, role })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "invites"],
      })
      toast.success("Invite sent.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const cancel = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(slug, inviteId),
    onSuccess: async () => {
      setConfirm(null)
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "invites"],
      })
      toast.success("Invite canceled.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (data.invites.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm text-muted-foreground">Pending</h3>
      <ul className="divide-y border-y">
        {data.invites.map((invite) => {
          const expired = invite.expiresAt < now
          const resending =
            resend.isPending && resend.variables?.id === invite.id
          return (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="truncate">{invite.email}</div>
                <div className="text-sm text-muted-foreground">
                  {roleLabel(invite.role)}
                  {expired ? " · Expired" : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={resending}
                  onClick={() => {
                    resend.mutate(invite)
                  }}
                >
                  {resending ? "Sending…" : "Resend"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={cancel.isPending}
                  onClick={() => {
                    setConfirm(invite)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel the invite to {confirm?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The link in the email stops working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>
              Keep invite
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancel.isPending || confirm === null}
              onClick={() => {
                if (confirm) cancel.mutate(confirm.id)
              }}
            >
              {cancel.isPending ? "Canceling…" : "Cancel invite"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InviteForm({ slug }: { slug: string }) {
  const queryClient = useQueryClient()
  const invite = useMutation({
    mutationFn: (value: { email: string; role: InviteRole }) =>
      sendInvite(slug, value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", slug, "invites"],
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const inviteForm = useForm({
    defaultValues: {
      email: "",
      role: "member" as InviteRole,
    },
    validators: {
      onSubmit: inviteFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const role = inviteRole(value.role)
      if (!role) return
      await invite.mutateAsync({ email: value.email, role })
      toast.success(`Invite sent to ${value.email}.`)
      formApi.reset()
    },
  })

  return (
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
        <inviteForm.Field name="role">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`${field.name}-role`}>Role</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(next) => {
                  const parsed = inviteRole(next)
                  if (parsed) field.handleChange(parsed)
                }}
              >
                <SelectTrigger id={`${field.name}-role`} className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </inviteForm.Field>
        <inviteForm.Field name="email">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Invite someone</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="teammate@example.com…"
                  className="flex-1"
                />
                <inviteForm.Subscribe selector={(state) => state.isSubmitting}>
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
  )
}
