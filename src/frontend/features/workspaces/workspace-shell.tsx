import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import {
  Link,
  Outlet,
  getRouteApi,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import { BrandMark } from "@components/brand-mark"
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
import { authClient } from "@lib/auth/client"
import { cn } from "@lib/utils"

import { workspaceQueryOptions, workspacesQueryOptions } from "./api"

const routeApi = getRouteApi("/_authed/businesses/$slug")

export function WorkspaceShell() {
  const { session } = routeApi.useRouteContext()
  const { slug } = routeApi.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
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
      <header className="sticky top-0 z-40 shrink-0 bg-background/80 px-5 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4">
          <BrandMark to="/businesses" className="shrink-0" />
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/businesses/$slug"
              params={{ slug }}
              activeOptions={{ exact: true }}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground",
                pathname === `/businesses/${slug}`
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Invoices
            </Link>
            <Link
              to="/businesses/$slug/customers"
              params={{ slug }}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground",
                pathname.startsWith(`/businesses/${slug}/customers`)
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Customers
            </Link>
            <Link
              to="/businesses/$slug/products"
              params={{ slug }}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground",
                pathname.startsWith(`/businesses/${slug}/products`)
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Products
            </Link>
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex max-w-[14rem] items-center gap-1 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring">
              <span className="truncate">{workspace.workspace.name}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {session.user.email}
                </span>
              </DropdownMenuLabel>
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
                <Link to="/businesses">All businesses</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/account">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div
        className={cn(
          "mx-auto flex w-full max-w-5xl flex-1 flex-col px-5",
          isInvoiceBuilder ? "min-h-0 overflow-hidden pt-3" : "pt-4 pb-8"
        )}
      >
        <Outlet />
      </div>
    </div>
  )
}
