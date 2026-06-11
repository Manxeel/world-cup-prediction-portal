import { NavSkeleton } from "@/components/nav-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomeLoading() {
  return (
    <div className="min-h-svh bg-background">
      <NavSkeleton />

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-10 w-full max-w-lg" />
          <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-xl" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="mb-4 h-10 w-64 rounded-lg" />
        <div className="mb-4 flex flex-wrap gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  )
}
