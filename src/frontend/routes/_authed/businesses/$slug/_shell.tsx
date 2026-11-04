import { createFileRoute } from "@tanstack/react-router"

import { WorkspaceShell } from "@features/workspaces/workspace-shell"

export const Route = createFileRoute("/_authed/businesses/$slug/_shell")({
  component: WorkspaceShell,
})
