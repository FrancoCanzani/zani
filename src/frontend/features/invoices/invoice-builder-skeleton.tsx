import { Skeleton } from "@components/ui/skeleton"

export function InvoiceBuilderSkeleton() {
  return (
    <div className="flex h-svh flex-col bg-background" aria-busy="true">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 lg:max-w-[40rem] lg:flex-none lg:basis-[44%] lg:border-r lg:border-border">
          <div className="mx-auto w-full max-w-xl space-y-10 px-6 py-8 sm:px-8">
            {[16, 9, 28].map((height) => (
              <div key={height} className="space-y-4">
                <Skeleton className="h-6 w-28" />
                <Skeleton style={{ height: `${height * 4}px` }} />
              </div>
            ))}
          </div>
        </div>
        <aside className="hidden min-w-0 flex-1 bg-secondary lg:block">
          <div className="mx-auto w-full max-w-[42rem] px-8 pt-16">
            <div className="aspect-[8.5/11] w-full bg-card shadow-sm" />
          </div>
        </aside>
      </div>
    </div>
  )
}
