import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function CheckNotFound() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-900 border border-surface-700 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Check not found</h2>
        <p className="text-surface-400 mb-6">
          The check you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          href="/checks"
          className="inline-block px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
        >
          Back to Checks
        </Link>
      </div>
    </div>
  )
}

