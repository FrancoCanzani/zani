import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

import { useTheme } from "@components/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-3.5" />,
        info: <InfoIcon className="size-3.5" />,
        warning: <TriangleAlertIcon className="size-3.5" />,
        error: <OctagonXIcon className="size-3.5" />,
        loading: <Loader2Icon className="size-3.5 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !min-h-0 !gap-2 !py-2 !text-xs",
          title: "!text-xs",
          description: "!text-xs !opacity-90",
          icon: "!size-3.5 !m-0",
          closeButton: "!size-5 !scale-90",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
