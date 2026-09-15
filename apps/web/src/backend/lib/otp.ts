export type OtpType =
  "sign-in" | "email-verification" | "forget-password" | "change-email"

type WaitUntilCtx = {
  waitUntil: (promise: Promise<unknown>) => void
}

export async function deliverOtp(
  env: Env,
  ctx: WaitUntilCtx | undefined,
  input: { email: string; otp: string; type: OtpType }
) {
  if (env.ENVIRONMENT !== "production") {
    console.log(`[otp] ${input.type} ${input.email} ${input.otp}`)
    return
  }

  const sending = sendOtpEmail(env, input)

  if (ctx) {
    ctx.waitUntil(sending)
    return
  }

  await sending
}

async function sendOtpEmail(
  env: Env,
  input: { email: string; otp: string; type: OtpType }
) {
  await env.EMAIL.send({
    from: env.EMAIL_FROM,
    to: input.email,
    subject: otpSubject(input.type),
    text: `Your code is ${input.otp}. It expires in 5 minutes.`,
    html: `<p>Your code is <strong>${input.otp}</strong>. It expires in 5 minutes.</p>`,
  })
}

function otpSubject(type: OtpType): string {
  switch (type) {
    case "sign-in":
      return "Your sign-in code"
    case "email-verification":
      return "Verify your email"
    case "forget-password":
      return "Reset your password"
    case "change-email":
      return "Confirm your email change"
    default: {
      const exhaustive: never = type
      return exhaustive
    }
  }
}
