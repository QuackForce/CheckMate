export default function ChecksLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-surface-800 h-[84px] flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-surface-800 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-32 bg-surface-800 rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-surface-800 rounded-lg animate-pulse" />
          ))}
        </div>

        <div className="card overflow-hidden">
          {/* Table rows */}
          <div className="divide-y divide-surface-700/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-surface-800 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-surface-800 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-surface-800 rounded animate-pulse mt-1" />
                </div>
                <div className="h-6 w-24 bg-surface-800 rounded-full animate-pulse" />
                <div className="h-8 w-20 bg-surface-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}







