import { FileText, Plus } from 'lucide-react'

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Check Templates</h2>
          <p className="text-sm text-surface-400 mt-1">
            Create and manage reusable check templates
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="card p-12 text-center">
        <FileText className="w-12 h-12 text-surface-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
        <p className="text-surface-400 mb-4 max-w-md mx-auto">
          Templates allow you to create predefined sets of systems and check items that can be applied to clients.
        </p>
        <button className="btn-secondary">Create First Template</button>
      </div>
    </div>
  )
}












