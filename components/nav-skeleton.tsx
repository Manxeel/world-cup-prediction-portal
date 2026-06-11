import { Skeleton } from "@/components/ui/skeleton"

export function NavSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-1">
          <Skeleton className="h-9 w-24 hidden sm:block" />
          <Skeleton className="h-9 w-24 hidden sm:block" />
          <Skeleton className="h-9 w-24 hidden sm:block" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </header>
  )
}
