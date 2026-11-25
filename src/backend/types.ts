import type { InferSelectModel } from "drizzle-orm"

import { workspace, workspaceMember } from "./db/schema"
import type { Auth } from "./lib/auth"

export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>

export type Workspace = InferSelectModel<typeof workspace>
export type WorkspaceMember = InferSelectModel<typeof workspaceMember>

// Stripe OAuth is optional; without both values sites connect with a restricted key.
type StripeOauthBindings = {
  STRIPE_CLIENT_ID?: string
  STRIPE_SECRET_KEY?: string
}

export type AppEnv = {
  Bindings: Env & StripeOauthBindings
  Variables: {
    user: AuthSession["user"]
    session: AuthSession["session"]
    workspace?: Workspace
    membership?: WorkspaceMember
  }
}
