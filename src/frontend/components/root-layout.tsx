import { Outlet } from "@tanstack/react-router"

import { ThemeProvider } from "@components/theme-provider"
import { Toaster } from "@components/ui/sonner"
import { TooltipProvider } from "@components/ui/tooltip"

export function RootLayout() {
  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Outlet />
        <Toaster position="bottom-center" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}
