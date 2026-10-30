import { getRouteApi, useRouter } from "@tanstack/react-router"
import { type SubmitEvent, useState } from "react"
import { toast } from "sonner"

import { BrandMark } from "@components/brand-mark"
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
  const [pending, setPending] = useState(false)

  async function sendCode(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setPending(false)
    if (sendError) {
      toast.error(sendError.message ?? "Could not send a sign-in code.")
      return
    }
    setOtp("")
    setStep("otp")
    toast.success("Code sent.")
  }

  async function verifyCode(code: string) {
    if (pending) {
      return
    }
    setPending(true)
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email,
      otp: code,
    })
    setPending(false)
    if (verifyError) {
      toast.error(verifyError.message ?? "That code is invalid or expired.")
      return
    }
    await router.invalidate()
    await router.navigate({ href: safeInternalPath(redirectTo) })
  }

  async function resendCode() {
    setPending(true)
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setPending(false)
    if (sendError) {
      toast.error(sendError.message ?? "Could not resend the sign-in code.")
      return
    }
    setOtp("")
    toast.success("Code resent.")
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="px-5">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center">
          <BrandMark />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <p className="text-sm text-muted-foreground italic">Welcome back</p>
        <h1 className="mt-4 text-2xl font-normal tracking-tight sm:text-3xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step === "email"
            ? "We’ll email you a one-time code."
            : `Code sent to ${email}.`}
        </p>

        <div className="mt-8">
          {step === "email" ? (
            <EmailStep
              email={email}
              pending={pending}
              onEmailChange={setEmail}
              onSubmit={sendCode}
            />
          ) : (
            <OtpStep
              otp={otp}
              pending={pending}
              onOtpChange={setOtp}
              onVerify={verifyCode}
              onResend={resendCode}
              onChangeEmail={() => {
                setStep("email")
                setOtp("")
              }}
            />
          )}
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href="#terms"
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#privacy"
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Privacy Policy
          </a>
          .
        </p>
      </main>
    </div>
  )
}

function EmailStep({
  email,
  pending,
  onEmailChange,
  onSubmit,
}: {
  email: string
  pending: boolean
  onEmailChange: (value: string) => void
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Email</span>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Sending…" : "Continue"}
      </Button>
    </form>
  )
}

function OtpStep({
  otp,
  pending,
  onOtpChange,
  onVerify,
  onResend,
  onChangeEmail,
}: {
  otp: string
  pending: boolean
  onOtpChange: (value: string) => void
  onVerify: (code: string) => void
  onResend: () => void
  onChangeEmail: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onVerify(otp)
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Code</span>
          <InputOTP
            id="otp"
            maxLength={6}
            value={otp}
            onChange={onOtpChange}
            disabled={pending}
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
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || otp.length !== 6}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onResend}
        >
          Resend
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onChangeEmail}
        >
          Different email
        </Button>
      </div>
    </div>
  )
}
