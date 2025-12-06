import { Loader2 } from 'lucide-react'

export default function SettingsLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  )
}

