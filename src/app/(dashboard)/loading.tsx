import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-surface-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}

