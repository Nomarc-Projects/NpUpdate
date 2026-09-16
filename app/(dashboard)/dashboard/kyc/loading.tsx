import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-5 sm:p-7 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <Skeleton className="h-3 w-28 mb-4" />
            <div className="flex flex-col items-center">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="h-4 w-24 mt-4" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
          </div>
          <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5">
            <Skeleton className="h-3 w-28 mb-3" />
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
