import { useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-48 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background"
        >
          {(name || email).slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate">{name || email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="truncate text-xs font-normal text-muted-foreground">
            {email}
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
  )
}
