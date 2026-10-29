import { useSuspenseQuery } from "@tanstack/react-query"
import {
  Link,
  Outlet,
  getRouteApi,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { cn } from "@lib/utils"

import { workspaceQueryOptions, workspacesQueryOptions } from "./api"

const routeApi = getRouteApi("/_authed/businesses/$slug")

export function WorkspaceShell() {
  const { slug } = routeApi.useParams()
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { data: workspace } = useSuspenseQuery(workspaceQueryOptions(slug))
  const { data: workspaces } = useSuspenseQuery(workspacesQueryOptions())

  const isInvoiceBuilder = /\/invoices\/[^/]+$/.test(pathname)

  return (
    <div
      className={cn(
        "flex flex-col",
        isInvoiceBuilder ? "h-svh overflow-hidden" : "min-h-svh"
      )}
    >
      <header className="shrink-0 px-5">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4">
          <Link to="/businesses" className="text-lg tracking-tight">
            zani
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex max-w-[14rem] items-center gap-1 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <span className="truncate">{workspace.workspace.name}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/businesses">Businesses</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/businesses/$slug" params={{ slug }}>
                  Invoices
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Switch business</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={slug}
                onValueChange={(next) => {
                  void router.navigate({
                    to: "/businesses/$slug",
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
                <Link to="/businesses/new">New business</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/businesses/$slug/settings" params={{ slug }}>
                  Business settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div
        className={cn(
          "mx-auto flex w-full max-w-5xl flex-1 flex-col px-5",
          isInvoiceBuilder
            ? "min-h-0 overflow-hidden pt-3"
            : "pt-4 pb-8"
        )}
      >
        <Outlet />
      </div>
    </div>
  )
}
