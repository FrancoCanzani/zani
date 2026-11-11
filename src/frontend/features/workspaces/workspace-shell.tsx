import { useQueryClient } from "@tanstack/react-query"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { authClient } from "@lib/auth/client"
import { cn } from "@lib/utils"

const routeApi = getRouteApi("/_authed/businesses/$slug")

export function WorkspaceShell() {
  const { session } = routeApi.useRouteContext()
  const { slug } = routeApi.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <div className="flex min-h-svh flex-col">
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
              Sites
            </Link>
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex max-w-[14rem] items-center gap-1 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring">
              <span className="truncate">{session.user.name}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {session.user.email}
                </span>
              </DropdownMenuLabel>
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
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-12 pb-8">
        <Outlet />
      </div>
    </div>
  )
}
