import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { SignInPage } from "@features/auth/sign-in-page"
import { safeInternalPath } from "@lib/safe-internal-path"

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
