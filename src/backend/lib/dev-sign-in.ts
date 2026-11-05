import { APIError, createAuthEndpoint } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"
import { z } from "zod"

const DEV_SIGN_IN_EMAIL = "francocanzani@gmail.com"

export function devSignInPlugin() {
  return {
    id: "dev-sign-in",
    endpoints: {
      devSignIn: createAuthEndpoint(
        "/dev-sign-in",
        {
          method: "POST",
          body: z.object({
            email: z.string(),
          }),
        },
        async (ctx) => {
          const email = ctx.body.email.trim().toLowerCase()
          if (email !== DEV_SIGN_IN_EMAIL) {
            throw APIError.from("FORBIDDEN", {
              code: "DEV_SIGN_IN_FORBIDDEN",
              message: "This sign-in is not available.",
            })
          }

          const existing = await ctx.context.internalAdapter.findUserByEmail(email)
          let user = existing?.user ?? null
          if (!user) {
            user = await ctx.context.internalAdapter.createUser(
              {
                email,
                emailVerified: true,
                name: "",
              },
              { method: "email-otp" }
            )
          } else if (!user.emailVerified) {
            user = await ctx.context.internalAdapter.updateUser(user.id, {
              emailVerified: true,
            })
          }

          if (!user) {
            throw APIError.from("INTERNAL_SERVER_ERROR", {
              code: "DEV_SIGN_IN_FAILED",
              message: "Could not sign in.",
            })
          }

          const session = await ctx.context.internalAdapter.createSession(user.id)
          await setSessionCookie(ctx, { session, user })
          return ctx.json({ token: session.token, user })
        }
      ),
    },
  }
}
