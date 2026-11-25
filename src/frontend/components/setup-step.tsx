import { CheckCircle2Icon, CircleIcon } from "lucide-react"
import type { ReactNode } from "react"

import { CopyButton } from "@components/install-snippet"

export type StepState = "done" | "waiting" | "todo"

export function StepStatus({
  state,
  label,
}: {
  state: StepState
  label: string
}) {
  return (
    <span
      className={`ml-auto flex shrink-0 items-center gap-1.5 text-xs ${
        state === "done" ? "text-emerald-700" : "text-muted-foreground"
      }`}
    >
      {state === "done" ? (
        <CheckCircle2Icon aria-hidden className="size-3.5" />
      ) : state === "waiting" ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
      ) : (
        <CircleIcon aria-hidden className="size-3.5" />
      )}
      {label}
    </span>
  )
}

export function Step({
  index,
  title,
  state,
  status,
  children,
}: {
  index: number
  title: string
  state: StepState
  status: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
          {index}
        </span>
        <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>
        <StepStatus state={state} label={status} />
      </div>
      {children}
    </div>
  )
}

export function CodeBlock({
  code,
  label,
  language,
}: {
  code: string
  label: string
  language: string
}) {
  return (
    <div className="bg-secondary">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xs text-muted-foreground">{language}</span>
        <CopyButton value={code} label={label} className="ml-auto" />
      </div>
      <pre className="no-scrollbar overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}
