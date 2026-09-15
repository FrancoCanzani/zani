import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { type SubmitEvent, useState } from "react"
import { z } from "zod"

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
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"

import { authClient } from "@lib/auth/client"

function safeInternalPath(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/"
  }
  return path
}

const signInSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({ href: safeInternalPath(search.redirect) })
    }
  },
  component: SignInPage,
})

type Step = "email" | "otp"

function SignInPage() {
  const router = useRouter()
  const { redirect: redirectTo } = Route.useSearch()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function sendCode(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setPending(false)
    if (sendError) {
      setError(sendError.message ?? "Could not send a sign-in code.")
      return
    }
    setOtp("")
    setStep("otp")
  }

  async function verifyCode(code: string) {
    if (pending) {
      return
    }
    setError(null)
    setPending(true)
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email,
      otp: code,
    })
    setPending(false)
    if (verifyError) {
      setError(verifyError.message ?? "That code is invalid or expired.")
      return
    }
    await router.invalidate()
    await router.navigate({ href: safeInternalPath(redirectTo) })
  }

  async function resendCode() {
    setError(null)
    setPending(true)
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setPending(false)
    if (sendError) {
      setError(sendError.message ?? "Could not resend the sign-in code.")
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email and we will send a one-time code."
              : `Enter the 6-digit code sent to ${email}. In development the code is printed in the Worker console.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {renderStep({
            step,
            email,
            otp,
            pending,
            onEmailChange: setEmail,
            onOtpChange: setOtp,
            onSendCode: sendCode,
            onVerifyCode: verifyCode,
            onResend: resendCode,
            onChangeEmail: () => {
              setStep("email")
              setOtp("")
              setError(null)
            },
          })}
        </CardContent>
      </Card>
    </main>
  )
}

function renderStep(input: {
  step: Step
  email: string
  otp: string
  pending: boolean
  onEmailChange: (value: string) => void
  onOtpChange: (value: string) => void
  onSendCode: (event: SubmitEvent<HTMLFormElement>) => void
  onVerifyCode: (code: string) => void
  onResend: () => void
  onChangeEmail: () => void
}) {
  switch (input.step) {
    case "email":
      return (
        <form onSubmit={input.onSendCode}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={input.email}
                onChange={(event) => input.onEmailChange(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" disabled={input.pending}>
              {input.pending ? "Sending code…" : "Send code"}
            </Button>
          </FieldGroup>
        </form>
      )
    case "otp":
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void input.onVerifyCode(input.otp)
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="otp">One-time code</FieldLabel>
              <InputOTP
                id="otp"
                maxLength={6}
                value={input.otp}
                onChange={input.onOtpChange}
                onComplete={(value) => {
                  void input.onVerifyCode(value)
                }}
                disabled={input.pending}
                autoFocus
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
              <FieldDescription>
                The code expires in 5 minutes.
              </FieldDescription>
            </Field>
            <Button
              type="submit"
              disabled={input.pending || input.otp.length !== 6}
            >
              {input.pending ? "Signing in…" : "Sign in"}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={input.pending}
                onClick={input.onResend}
              >
                Resend code
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={input.pending}
                onClick={input.onChangeEmail}
              >
                Use a different email
              </Button>
            </div>
          </FieldGroup>
        </form>
      )
    default: {
      const exhaustive: never = input.step
      return exhaustive
    }
  }
}
