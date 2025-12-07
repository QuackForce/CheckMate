export default function ReportsLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-surface-800 h-[84px] flex items-center justify-between">
        <div>
          <div className="h-8 w-28 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-surface-800 rounded animate-pulse mt-2" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="h-4 w-24 bg-surface-800 rounded animate-pulse" />
              <div className="h-8 w-16 bg-surface-800 rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>

        {/* Reports list */}
        <div className="card overflow-hidden">
          <div className="divide-y divide-surface-700/50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-surface-800 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-surface-800 rounded animate-pulse mt-1" />
                </div>
                <div className="h-8 w-24 bg-surface-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}



