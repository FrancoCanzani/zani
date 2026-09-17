import { AppShell } from "@components/app-shell"

export function PendingScreen({ label }: { label: string }) {
  return (
    <AppShell>
      <main className="py-16">
        <p className="text-sm text-muted-foreground italic">{label}</p>
      </main>
    </AppShell>
  )
}
