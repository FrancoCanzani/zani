import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, Outlet, getRouteApi, useRouter } from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"

import { authClient } from "@lib/auth/client"

import { workspaceQueryOptions, workspacesQueryOptions } from "./api"

const routeApi = getRouteApi("/_authed/w/$slug")

export function WorkspaceShell() {
  const { slug } = routeApi.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: workspace } = useSuspenseQuery(workspaceQueryOptions(slug))
  const { data: workspaces } = useSuspenseQuery(workspacesQueryOptions())

  return (
    <div className="flex min-h-svh flex-col">
      <header>
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-6">
          <Link
            to="/w/$slug"
            params={{ slug }}
            className="text-lg tracking-tight"
          >
            zani
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex max-w-[14rem] items-center gap-1 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <span className="truncate">{workspace.workspace.name}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuRadioGroup
                value={slug}
                onValueChange={(next) => {
                  void router.navigate({
                    to: "/w/$slug",
                    params: { slug: next },
                  })
                }}
              >
                {workspaces.workspaces.map((item) => (
                  <DropdownMenuRadioItem key={item.id} value={item.slug}>
                    {item.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/onboarding">New workspace</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void authClient.signOut({
                    fetchOptions: {
                      onSuccess: async () => {
                        queryClient.clear()
                        await router.invalidate()
                        await router.navigate({ to: "/sign-in" })
                      },
                    },
                  })
                }}
              >
                Sign out
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/w/$slug/settings" params={{ slug }}>
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8">
        <Outlet />
      </div>
    </div>
  )
}
