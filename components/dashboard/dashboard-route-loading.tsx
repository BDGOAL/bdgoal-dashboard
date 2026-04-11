import { Skeleton } from "@/components/ui/skeleton"

/** Shared skeleton while heavy dashboard segments stream or client chunks load. */
export function DashboardRouteLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-[70%]" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  )
}
