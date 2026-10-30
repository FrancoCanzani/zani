import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@components/ui/input-otp"

import { authClient } from "@lib/auth/client"
import { fieldErrors } from "@lib/utils"

const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
})

type DeleteStep = "confirm" | "otp"

type AccountSettingsProps = {
  name: string
  email: string
}

export function AccountSettings({ name, email }: AccountSettingsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("confirm")
  const [deleteOtp, setDeleteOtp] = useState("")
  const [deletePending, setDeletePending] = useState(false)

  const form = useForm({
    defaultValues: {
      name,
    },
    validators: {
      onSubmit: nameSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const nextName = value.name.trim()
      const { error: updateError } = await authClient.updateUser({
        name: nextName,
      })
      if (updateError) {
        toast.error(updateError.message ?? "Could not save your name.")
        return
      }
      formApi.setFieldValue("name", nextName)
      toast.success("Name saved.")
      await router.invalidate()
    },
  })

  function resetDeleteDialog() {
    setDeleteStep("confirm")
    setDeleteOtp("")
    setDeletePending(false)
  }

  async function sendDeleteCode() {
    setDeletePending(true)
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setDeletePending(false)
    if (sendError) {
      toast.error(sendError.message ?? "Could not send a confirmation code.")
      return
    }
    setDeleteOtp("")
    setDeleteStep("otp")
    toast.success("Code sent.")
  }

  async function confirmDelete() {
    if (deletePending || deleteOtp.length !== 6) {
      return
    }
    setDeletePending(true)
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email,
      otp: deleteOtp,
    })
    if (verifyError) {
      setDeletePending(false)
      toast.error(verifyError.message ?? "That code is invalid or expired.")
      return
    }
    const { error: deleteUserError } = await authClient.deleteUser()
    if (deleteUserError) {
      setDeletePending(false)
      toast.error(deleteUserError.message ?? "Could not delete your account.")
      return
    }
    queryClient.clear()
    await router.invalidate()
    await router.navigate({ to: "/sign-in" })
  }

  return (
    <div className="space-y-8">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor={field.name}>Your name</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
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
                    {([isSubmitting, value]) => (
                      <Button
                        type="submit"
                        disabled={
                          Boolean(isSubmitting) ||
                          String(value).trim() === name
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
        <p className="truncate">{email}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You sign in with a one-time code we email to this address.
        </p>
      </div>

      <section className="space-y-3 border-t pt-8">
        <h2 className="text-sm text-muted-foreground">Delete account</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Permanently deletes your account and any businesses you own. We’ll
          email a confirmation code first.
        </p>
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) {
              resetDeleteDialog()
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            {deleteStep === "confirm" ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    We’ll email a one-time code to {email}. Enter it to
                    permanently delete your account and businesses you own. This
                    can’t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletePending}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletePending}
                    onClick={() => {
                      void sendDeleteCode()
                    }}
                  >
                    {deletePending ? "Sending…" : "Send code"}
                  </Button>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enter confirmation code</AlertDialogTitle>
                  <AlertDialogDescription>
                    Code sent to {email}. Enter it to delete your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={deleteOtp}
                    onChange={setDeleteOtp}
                    disabled={deletePending}
                    autoFocus
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletePending}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deletePending}
                    onClick={() => {
                      void sendDeleteCode()
                    }}
                  >
                    Resend
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletePending || deleteOtp.length !== 6}
                    onClick={() => {
                      void confirmDelete()
                    }}
                  >
                    {deletePending ? "Deleting…" : "Delete account"}
                  </Button>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  )
}
