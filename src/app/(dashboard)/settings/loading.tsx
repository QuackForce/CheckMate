export default function SettingsLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Settings nav skeleton */}
      <div className="flex gap-2 border-b border-surface-700/50 pb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-24 bg-surface-800 rounded-lg animate-pulse" />
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="card p-6 space-y-6">
        <div className="h-6 w-48 bg-surface-800 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-surface-800/50 rounded-lg">
              <div className="w-10 h-10 bg-surface-700 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-surface-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-surface-700 rounded animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-surface-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
