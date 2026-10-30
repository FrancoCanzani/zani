import { Link } from "@tanstack/react-router"

import { cn } from "@lib/utils"

type BrandMarkProps = {
  to?: "/" | "/businesses"
  className?: string
}

export function BrandMark({ to = "/", className }: BrandMarkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "font-brand text-[1.125rem] font-semibold tracking-[-0.06em] transition-opacity hover:opacity-70",
        className
      )}
    >
      zani
    </Link>
  )
}
