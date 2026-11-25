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
      <DropdownMenuTrigger className="max-w-48 rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-expanded:text-foreground">
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
