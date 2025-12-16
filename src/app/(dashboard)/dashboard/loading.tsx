export default function DashboardPageLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-surface-800 h-[84px] flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-surface-800 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-28 bg-surface-800 rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="h-4 w-20 bg-surface-800 rounded animate-pulse" />
              <div className="h-8 w-16 bg-surface-800 rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6">
            <div className="h-6 w-40 bg-surface-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-800 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="card p-6">
            <div className="h-6 w-32 bg-surface-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-800 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}








