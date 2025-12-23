export default function TeamLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-surface-800 h-[84px] flex items-center justify-between">
        <div>
          <div className="h-8 w-24 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-40 bg-surface-800 rounded animate-pulse mt-2" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-surface-800 rounded-full animate-pulse" />
                <div>
                  <div className="h-5 w-32 bg-surface-800 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-surface-800 rounded animate-pulse mt-1" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-surface-800 rounded animate-pulse" />
                <div className="h-2 w-full bg-surface-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}











