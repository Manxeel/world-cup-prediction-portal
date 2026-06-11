import { NavSkeleton } from "@/components/nav-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function TablaLoading() {
  return (
    <div className="min-h-svh bg-background">
      <NavSkeleton />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="h-11 rounded-none" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-none border-t border-border" />
          ))}
        </div>
      </main>
    </div>
  )
}
