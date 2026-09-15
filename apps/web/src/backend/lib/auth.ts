import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import * as schema from "@workspace/db/schema"
import { betterAuth } from "better-auth"
import { emailOTP } from "better-auth/plugins"

import { AUTH_BASE_PATH } from "@shared/api"

import { createDb } from "./db"
import { deliverOtp } from "./otp"

type WaitUntilCtx = {
  waitUntil: (promise: Promise<unknown>) => void
}

export function createAuth(env: Env, ctx?: WaitUntilCtx) {
  const db = createDb(env)

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    plugins: [
      emailOTP({
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          await deliverOtp(env, ctx, { email, otp, type })
        },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
