export default function CheckDetailLoading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-surface-950/95 backdrop-blur-xl border-b border-surface-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-surface-800 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-64 bg-surface-800 rounded animate-pulse" />
                <div className="h-4 w-48 bg-surface-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 bg-surface-800 rounded-xl animate-pulse" />
              <div className="h-10 w-24 bg-surface-800 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Progress bar skeleton */}
          <div className="h-2 w-full bg-surface-800 rounded-full animate-pulse" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-surface-700 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 bg-surface-700 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-surface-700 rounded animate-pulse" />
                </div>
                <div className="w-5 h-5 bg-surface-700 rounded animate-pulse" />
              </div>
              <div className="border-t border-surface-700/50 p-4 space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-surface-700 rounded animate-pulse" />
                    <div className="h-4 flex-1 bg-surface-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
