import type { ReactNode } from "react"

import { SidebarTrigger } from "@components/ui/sidebar"

export function ShellTopBar({
  children,
  end,
}: {
  children?: ReactNode
  end?: ReactNode
}) {
  return (
    <div className="flex h-14 items-center gap-3">
      <SidebarTrigger className="-ml-1.5" />
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {end ? <div className="flex shrink-0 items-center gap-2">{end}</div> : null}
    </div>
  )
}
