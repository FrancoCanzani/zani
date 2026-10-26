import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { Link, getRouteApi, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { z } from "zod"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@components/ui/field"
import { Input } from "@components/ui/input"

import { authClient } from "@lib/auth/client"
import { fieldErrors } from "@lib/utils"

const routeApi = getRouteApi("/_authed/account")

const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
})

export function AccountPage() {
  const { session } = routeApi.useRouteContext()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const form = useForm({
    defaultValues: {
      name: session.user.name,
    },
    validators: {
      onSubmit: nameSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      setError(null)
      setSaved(false)
      const name = value.name.trim()
      const { error: updateError } = await authClient.updateUser({ name })
      if (updateError) {
        setError(updateError.message ?? "Could not save your name.")
        return
      }
      formApi.setFieldValue("name", name)
      setSaved(true)
      await router.invalidate()
    },
  })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
        <p className="text-lg tracking-tight">zani</p>
      </header>

      <div className="mt-16 flex flex-1 flex-col gap-10">
        <div className="space-y-2">
          <h1 className="text-2xl tracking-tight sm:text-3xl">Account</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your name and sign-in email.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setSaved(false)
            void form.handleSubmit()
          }}
        >
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-muted-foreground">Saved.</p>
          ) : null}
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id={field.name}
                      name={field.name}
                      autoComplete="name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setSaved(false)
                        field.handleChange(event.target.value)
                      }}
                      maxLength={80}
                      className="flex-1"
                    />
                    <form.Subscribe
                      selector={(state) => [
                        state.isSubmitting,
                        state.values.name,
                      ]}
                    >
                      {([isSubmitting, name]) => (
                        <Button
                          type="submit"
                          disabled={
                            Boolean(isSubmitting) ||
                            String(name).trim() === session.user.name
                          }
                        >
                          {isSubmitting ? "Saving…" : "Save"}
                        </Button>
                      )}
                    </form.Subscribe>
                  </div>
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </form>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="truncate">{session.user.email}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sign-in code goes here.
          </p>
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
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

        <section className="space-y-3 border-t pt-10">
          <h2 className="text-sm text-muted-foreground">Delete account</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Permanently deletes your account and any businesses you own. This
            cannot be undone.
          </p>
          {deleteError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open)
              if (!open) {
                setDeleteError(null)
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your account and businesses you own. Crew
                  memberships on other businesses are removed. You can’t undo
                  this.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => {
                    void (async () => {
                      setDeleting(true)
                      setDeleteError(null)
                      const { error: deleteUserError } =
                        await authClient.deleteUser()
                      if (deleteUserError) {
                        setDeleteError(
                          deleteUserError.message ??
                            "Could not delete your account. Sign in again and retry."
                        )
                        setDeleting(false)
                        return
                      }
                      queryClient.clear()
                      await router.invalidate()
                      await router.navigate({ to: "/sign-in" })
                    })()
                  }}
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </main>
  )
}
