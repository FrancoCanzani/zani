import type { AppEnv } from "../../../../types"

export function workspaceFromContext(vars: {
  workspace?: AppEnv["Variables"]["workspace"]
  membership?: AppEnv["Variables"]["membership"]
}) {
  if (!vars.workspace || !vars.membership) {
    throw new Error("workspace middleware did not set membership")
  }
  return { workspace: vars.workspace, membership: vars.membership }
}
