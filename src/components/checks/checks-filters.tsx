'use client'

import { useState } from 'react'
import { Search, Calendar, User } from 'lucide-react'

export function ChecksFilters() {
  const [search, setSearch] = useState('')

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input
          type="text"
          placeholder="Search by client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-surface-500" />
        <select className="input w-auto pr-8">
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Engineer filter */}
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-surface-500" />
        <select className="input w-auto pr-8">
          <option value="all">All Engineers</option>
          <option value="me">Assigned to Me</option>
          <option value="dylan">Dylan S.</option>
          <option value="sarah">Sarah M.</option>
          <option value="mike">Mike R.</option>
          <option value="jordan">Jordan P.</option>
        </select>
      </div>
    </div>
  )
}












