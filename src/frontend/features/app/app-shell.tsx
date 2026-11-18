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
  useSidebar,
} from "@components/ui/sidebar"

import { UserMenu } from "@features/account/user-menu"

const routeApi = getRouteApi("/_authed")

function ShellFrame({
  sitesActive,
  email,
  name,
}: {
  sitesActive: boolean
  email: string
  name: string
}) {
  const { open, openMobile, isMobile } = useSidebar()
  const sidebarVisible = isMobile ? openMobile : open

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="flex h-14 flex-row items-center gap-1 px-2">
          <BrandMark to="/businesses" className="min-w-0 flex-1 px-2 text-4xl" />
          {sidebarVisible ? <SidebarTrigger /> : null}
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
          <UserMenu name={name} email={email} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {!sidebarVisible ? (
          <SidebarTrigger className="fixed top-3 left-3 z-20" />
        ) : null}
        <div
          className={`mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-24 ${sidebarVisible ? "pt-8" : "pt-16"}`}
        >
          <Outlet />
        </div>
      </SidebarInset>
    </>
  )
}

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
      <ShellFrame
        sitesActive={sitesActive}
        email={session.user.email}
        name={session.user.name}
      />
    </SidebarProvider>
  )
}
