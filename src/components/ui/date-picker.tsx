'use client'

import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  min?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  label,
  required,
  min,
  className,
  disabled,
}: DatePickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-surface-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Calendar className="w-5 h-5 text-surface-400" />
        </div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          disabled={disabled}
          onClick={(e) => {
            // Ensure the picker opens when clicking anywhere (if supported)
            if (!disabled && 'showPicker' in e.currentTarget) {
              try {
                (e.currentTarget as any).showPicker()
              } catch (err) {
                // Fallback: just focus, which will open picker on some browsers
                e.currentTarget.focus()
              }
            }
          }}
          className={cn(
            'w-full pl-10 pr-4 py-3 bg-surface-800 border border-surface-700 rounded-lg',
            'text-white placeholder-surface-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500',
            'hover:border-surface-600 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
            // Hide native browser calendar icon but keep it functional (covers whole input)
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-20',
            // Make all parts clickable
            '[&::-webkit-datetime-edit]:cursor-pointer [&::-webkit-datetime-edit-fields-wrapper]:cursor-pointer [&::-webkit-datetime-edit-text]:cursor-pointer',
            // Ensure dark background
            '[&::-webkit-datetime-edit]:bg-surface-800 [&::-webkit-datetime-edit-fields-wrapper]:bg-surface-800 [&::-webkit-datetime-edit-text]:text-white'
          )}
          style={{
            // Additional CSS to hide native icons and ensure dark theme
            colorScheme: 'dark',
            backgroundColor: '#1e293b', // surface-800
            color: 'white',
          } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
