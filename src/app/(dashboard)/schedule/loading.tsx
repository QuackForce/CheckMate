export default function ScheduleLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-surface-800 h-[84px] flex items-center justify-between">
        <div>
          <div className="h-8 w-28 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-56 bg-surface-800 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-36 bg-surface-800 rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar skeleton */}
          <div className="lg:col-span-2 card">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <div className="h-6 w-40 bg-surface-800 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-surface-800 rounded animate-pulse" />
                <div className="h-8 w-8 bg-surface-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-24 bg-surface-800/50 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Form skeleton */}
          <div className="card p-6">
            <div className="h-6 w-32 bg-surface-800 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-surface-800 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-surface-800 rounded animate-pulse" />
                </div>
              ))}
              <div className="h-10 w-full bg-surface-800 rounded animate-pulse mt-6" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

