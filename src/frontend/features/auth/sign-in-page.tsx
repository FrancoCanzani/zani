import { Link, getRouteApi, useRouter } from "@tanstack/react-router"
import { type SubmitEvent, useState } from "react"

import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@components/ui/input-otp"

import { authClient } from "@lib/auth/client"
import { safeInternalPath } from "@lib/safe-internal-path"

const routeApi = getRouteApi("/sign-in")

type Step = "email" | "otp"

export function SignInPage() {
  const router = useRouter()
  const { redirect: redirectTo } = routeApi.useSearch()
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
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-6 py-16">
      <Link
        to="/"
        className="tracking-tight transition-opacity hover:opacity-70"
      >
        Zani Links
      </Link>

      <p className="mt-10 text-sm text-muted-foreground italic">Welcome back</p>
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
          <Button
            type="submit"
            disabled={input.pending}
            className="border-neutral-900 bg-neutral-800 text-white shadow-sm hover:bg-neutral-800"
          >
            {input.pending ? "Sending…" : "Continue"}
          </Button>
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
          <Button
            type="submit"
            disabled={input.pending || input.otp.length !== 6}
            className="border-neutral-900 bg-neutral-800 text-white shadow-sm hover:bg-neutral-800"
          >
            {input.pending ? "Signing in…" : "Sign in"}
          </Button>
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
