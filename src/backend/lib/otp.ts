import { sendAppEmail } from "./mail"

export type OtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email"

export async function deliverOtp(
  env: Env,
  ctx: Parameters<typeof sendAppEmail>[1],
  input: { email: string; otp: string; type: OtpType }
) {
  await sendAppEmail(env, ctx, {
    to: input.email,
    subject: otpSubject(input.type),
    text: `Your code is ${input.otp}. It expires in 5 minutes.`,
    html: `<p>Your code is <strong>${input.otp}</strong>. It expires in 5 minutes.</p>`,
    devLine: `[otp] ${input.type} ${input.email} ${input.otp}`,
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
