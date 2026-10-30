import { Outlet } from "@tanstack/react-router"

import { ThemeProvider } from "@components/theme-provider"
import { Toaster } from "@components/ui/sonner"

export function RootLayout() {
  return (
    <ThemeProvider defaultTheme="light">
      <Outlet />
      <Toaster position="bottom-center" richColors closeButton />
    </ThemeProvider>
  )
}
