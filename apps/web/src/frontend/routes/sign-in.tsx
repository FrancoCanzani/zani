import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { type SubmitEvent, useState } from "react"
import { z } from "zod"

import { AppShell } from "@components/app-shell"
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
    <AppShell
      nav={
        <Link to="/" className="transition-colors hover:text-foreground">
          Back
        </Link>
      }
    >
      <main className="flex max-w-sm flex-col py-16">
        <p className="text-sm text-muted-foreground italic">Welcome back</p>
        <h1 className="mt-4 text-2xl font-normal tracking-tight sm:text-3xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step === "email"
            ? "We’ll email you a one-time code."
            : `Code sent to ${email}.`}
        </p>

        {error ? (
          <p className="mt-6 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className={error ? "mt-4" : "mt-8"}>
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
        </div>
      </main>
    </AppShell>
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
        <form onSubmit={input.onSendCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Email</span>
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
          </label>
          <button
            type="submit"
            disabled={input.pending}
            className="group flex cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-800 px-4 py-1 text-base text-white shadow-sm transition-all duration-300 disabled:opacity-50"
          >
            {input.pending ? "Sending…" : "Continue"}
          </button>
        </form>
      )
    case "otp":
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void input.onVerifyCode(input.otp)
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Code</span>
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
          </label>
          <button
            type="submit"
            disabled={input.pending || input.otp.length !== 6}
            className="group flex cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-800 px-4 py-1 text-base text-white shadow-sm transition-all duration-300 disabled:opacity-50"
          >
            {input.pending ? "Signing in…" : "Sign in"}
          </button>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <button
              type="button"
              disabled={input.pending}
              onClick={input.onResend}
              className="transition-colors hover:text-foreground disabled:opacity-50"
            >
              Resend
            </button>
            <button
              type="button"
              disabled={input.pending}
              onClick={input.onChangeEmail}
              className="transition-colors hover:text-foreground disabled:opacity-50"
            >
              Different email
            </button>
          </div>
        </form>
      )
    default: {
      const exhaustive: never = input.step
      return exhaustive
    }
  }
}
