import type { Auth } from "./lib/auth"

export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: AuthSession["user"]
    session: AuthSession["session"]
  }
}
