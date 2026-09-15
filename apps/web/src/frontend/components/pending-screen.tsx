export function PendingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
    </main>
  )
}
