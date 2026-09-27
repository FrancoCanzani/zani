export function PendingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <p className="text-sm text-muted-foreground italic">{label}</p>
    </main>
  )
}

export function pendingScreen(label: string) {
  function Pending() {
    return <PendingScreen label={label} />
  }

  return Pending
}
