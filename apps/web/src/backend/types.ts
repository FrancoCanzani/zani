import type { InferSelectModel } from "drizzle-orm"
import { workspace, workspaceMember } from "@workspace/db/schema"

import type { Auth } from "./lib/auth"

export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>

export type Workspace = InferSelectModel<typeof workspace>
export type WorkspaceMember = InferSelectModel<typeof workspaceMember>

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: AuthSession["user"]
    session: AuthSession["session"]
    workspace?: Workspace
    membership?: WorkspaceMember
  }
}
