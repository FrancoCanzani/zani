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
      <Sidebar collapsible="offcanvas" className="border-r-0!">
        <SidebarHeader className="px-2 pt-6">
          <BrandMark to="/businesses" className="px-2" />
        </SidebarHeader>
        <SidebarContent className="mt-6">
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={sitesActive}
                className="bg-transparent font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-active:bg-transparent data-active:font-normal data-active:text-foreground"
              >
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
        <div className="px-4 pt-3">
          <SidebarTrigger />
        </div>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
