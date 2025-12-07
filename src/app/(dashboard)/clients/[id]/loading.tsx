export default function ClientDetailLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-surface-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-surface-800 rounded-xl animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-surface-800 rounded animate-pulse" />
            <div className="h-4 w-32 bg-surface-800 rounded animate-pulse mt-2" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        {/* Quick links */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-28 bg-surface-800 rounded-lg animate-pulse" />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="h-6 w-32 bg-surface-800 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-20 bg-surface-800 rounded animate-pulse mb-1" />
                    <div className="h-5 w-32 bg-surface-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="card p-6">
            <div className="h-6 w-24 bg-surface-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-800 rounded-full animate-pulse" />
                  <div className="h-4 w-28 bg-surface-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


