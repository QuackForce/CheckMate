'use client'

import Link from 'next/link'
import { 
  Building2, 
  MessageSquare, 
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react'
import { cn, formatDate, getRelativeTime, getCadenceLabel, getClientStatusColor } from '@/lib/utils'

interface Client {
  id: string
  name: string
  status: 'ACTIVE' | 'INACTIVE' | 'ONBOARDING' | 'OFFBOARDING'
  slackChannelName: string | null
  defaultCadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY'
  assignedEngineers: { id: string; name: string }[]
  lastCheckDate: Date | null
  nextCheckDate: Date | null
  checksCompleted: number
}

interface ClientsTableProps {
  clients: Client[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const isOverdue = (date: Date | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-800/50">
            <tr>
              <th className="table-header table-cell">Client</th>
              <th className="table-header table-cell">Status</th>
              <th className="table-header table-cell">Cadence</th>
              <th className="table-header table-cell">Assigned</th>
              <th className="table-header table-cell">Next Check</th>
              <th className="table-header table-cell">Completed</th>
              <th className="table-header table-cell w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {clients.map((client, index) => {
              const overdue = isOverdue(client.nextCheckDate)

              return (
                <tr
                  key={client.id}
                  className={cn(
                    'hover:bg-surface-800/30 transition-colors animate-slide-up',
                    overdue && client.status === 'ACTIVE' && 'bg-red-500/5'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Client name */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-surface-400" />
                      </div>
                      <div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-white hover:text-brand-400 transition-colors"
                        >
                          {client.name}
                        </Link>
                        {client.slackChannelName && (
                          <div className="flex items-center gap-1 text-xs text-surface-500 mt-0.5">
                            <MessageSquare className="w-3 h-3" />
                            {client.slackChannelName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="table-cell">
                    <span className={cn('badge', getClientStatusColor(client.status))}>
                      {client.status.charAt(0) + client.status.slice(1).toLowerCase()}
                    </span>
                  </td>

                  {/* Cadence */}
                  <td className="table-cell">
                    <span className="text-surface-300">
                      {getCadenceLabel(client.defaultCadence)}
                    </span>
                  </td>

                  {/* Assigned engineers */}
                  <td className="table-cell">
                    {client.assignedEngineers.length > 0 ? (
                      <div className="flex -space-x-2">
                        {client.assignedEngineers.slice(0, 3).map((engineer) => (
                          <div
                            key={engineer.id}
                            className="w-8 h-8 rounded-full bg-surface-600 border-2 border-surface-900 flex items-center justify-center text-xs font-medium text-surface-200"
                            title={engineer.name}
                          >
                            {engineer.name.charAt(0)}
                          </div>
                        ))}
                        {client.assignedEngineers.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-surface-700 border-2 border-surface-900 flex items-center justify-center text-xs font-medium text-surface-400">
                            +{client.assignedEngineers.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-surface-500 text-sm">Unassigned</span>
                    )}
                  </td>

                  {/* Next check */}
                  <td className="table-cell">
                    {client.nextCheckDate ? (
                      <div className={cn(
                        'flex items-center gap-2',
                        overdue && client.status === 'ACTIVE' ? 'text-red-400' : 'text-surface-300'
                      )}>
                        {overdue && client.status === 'ACTIVE' && (
                          <Clock className="w-4 h-4" />
                        )}
                        <span>{getRelativeTime(client.nextCheckDate)}</span>
                      </div>
                    ) : (
                      <span className="text-surface-500">—</span>
                    )}
                  </td>

                  {/* Completed checks */}
                  <td className="table-cell">
                    <span className="text-surface-300">{client.checksCompleted}</span>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="relative group">
                      <button className="p-2 hover:bg-surface-700 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-surface-400" />
                      </button>
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <Link
                          href={`/clients/${client.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Details
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Client
                        </Link>
                        <Link
                          href={`/checks/new?client=${client.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                          Schedule Check
                        </Link>
                        <hr className="my-1 border-surface-700" />
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                          Delete Client
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-surface-700/50 flex items-center justify-between">
        <p className="text-sm text-surface-400">
          Showing <span className="font-medium text-white">1-{clients.length}</span> of{' '}
          <span className="font-medium text-white">{clients.length}</span> clients
        </p>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm" disabled>
            Previous
          </button>
          <button className="btn-ghost text-sm" disabled>
            Next
          </button>
        </div>
      </div>
    </div>
  )
}


