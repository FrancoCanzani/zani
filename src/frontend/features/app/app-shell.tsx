import {
  Link,
  Outlet,
  getRouteApi,
  useRouterState,
} from "@tanstack/react-router"

import { BrandMark } from "@components/brand-mark"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@components/ui/sidebar"

import { UserMenu } from "@features/account/user-menu"

const routeApi = getRouteApi("/_authed")

export function AppShell() {
  const { session } = routeApi.useRouteContext()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const bare =
    !session || pathname === "/welcome" || pathname.startsWith("/invites/")

  if (bare) {
    return <Outlet />
  }

  const sitesActive =
    pathname === "/businesses" || pathname.startsWith("/businesses/")

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="h-14 justify-center px-2">
          <BrandMark to="/businesses" className="px-2 text-4xl" />
        </SidebarHeader>
        <SidebarContent className="mt-2">
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={sitesActive}>
                <Link to="/businesses">Sites</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="px-2 pb-4">
          <UserMenu name={session.user.name} email={session.user.email} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-14 items-center px-4">
          <SidebarTrigger />
        </div>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
