import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { z } from "zod"

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

const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
})

export function CompleteNamePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: nameSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)
      const { error: updateError } = await authClient.updateUser({
        name: value.name.trim(),
      })
      if (updateError) {
        setError(updateError.message ?? "Could not save your name.")
        return
      }
      await router.invalidate()
      await router.navigate({ to: "/dashboard" })
    },
  })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Almost there</p>
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
        What’s your name?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        So customers and your crew know who you are.
      </p>

      {error ? (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className={error ? "mt-4" : "mt-8"}
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
                <Input
                  id={field.name}
                  name={field.name}
                  autoComplete="name"
                  autoFocus
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Alex Rivera"
                />
                <FieldError errors={fieldErrors(field.state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Continue"}
              </Button>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </main>
  )
}
