import { useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"

import { authClient } from "@lib/auth/client"

type UserMenuProps = {
  name: string
  email: string
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const firstName = name.trim().split(/\s+/)[0] || name

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-[10rem] items-center gap-1 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring">
        <span className="truncate">{firstName}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
  )
}
