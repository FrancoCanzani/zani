import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { emailOTP } from "better-auth/plugins"
import { and, eq, inArray } from "drizzle-orm"

import * as schema from "../db/schema"
import { createDb } from "./db"
import { deliverOtp } from "./otp"
import { AUTH_BASE_PATH } from "./paths"

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
    user: {
      deleteUser: {
        enabled: true,
        async beforeDelete(user) {
          const owned = await db
            .select({ workspaceId: schema.workspaceMember.workspaceId })
            .from(schema.workspaceMember)
            .where(
              and(
                eq(schema.workspaceMember.userId, user.id),
                eq(schema.workspaceMember.role, "owner")
              )
            )

          const workspaceIds = owned.map((row) => row.workspaceId)
          if (workspaceIds.length === 0) {
            return
          }

          await db
            .delete(schema.workspace)
            .where(inArray(schema.workspace.id, workspaceIds))
        },
      },
    },
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
