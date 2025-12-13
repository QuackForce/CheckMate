'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
  searchable?: boolean
  onOpenChange?: (isOpen: boolean) => void
  showChevron?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  className,
  disabled = false,
  allowClear = false,
  searchable = true,
  onOpenChange,
  showChevron = true,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isUserInteractionRef = useRef(false)

  const selectedOption = options.find(opt => opt.value === value)

  // Filter options based on search
  const filteredOptions = searchable && search
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.description?.toLowerCase().includes(search.toLowerCase())
      )
    : options

  // Position dropdown using fixed positioning
  useEffect(() => {
    if (!isOpen || !inputRef.current || !dropdownRef.current) return

    const updatePosition = () => {
      if (!inputRef.current || !dropdownRef.current) return
      
      const rect = inputRef.current.getBoundingClientRect()
      dropdownRef.current.style.top = `${rect.bottom + 4}px`
      dropdownRef.current.style.left = `${rect.left}px`
      dropdownRef.current.style.width = `${rect.width}px`
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Check if click is inside the container or dropdown
      const isInsideContainer = containerRef.current?.contains(target)
      const isInsideDropdown = dropdownRef.current?.contains(target)
      
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false)
        setSearch('')
        onOpenChange?.(false)
      }
    }

    // Use click event instead of mousedown to allow dropdown item clicks to process first
    document.addEventListener('click', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // Removed onOpenChange from deps to prevent infinite loop

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearch('')
    onOpenChange?.(false)
  }

  // Track previous isOpen to only notify on actual changes
  const prevIsOpenRef = useRef(isOpen)
  const onOpenChangeRef = useRef(onOpenChange)
  
  // Keep ref updated
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])
  
  useEffect(() => {
    if (prevIsOpenRef.current !== isOpen) {
      prevIsOpenRef.current = isOpen
      onOpenChangeRef.current?.(isOpen)
    }
  }, [isOpen])

  // Ensure dropdown closes on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearch('')
        onOpenChange?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // Removed onOpenChange from deps to prevent infinite loop

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={cn('relative', isOpen && 'z-[100] overflow-visible', className)}>
      {/* Input/Button */}
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={isOpen && searchable ? search : (selectedOption?.label || '')}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={(e) => {
            // Only open on focus if it was a user interaction (click), not auto-focus
            if (isUserInteractionRef.current) {
              setIsOpen(true)
              isUserInteractionRef.current = false
            }
          }}
          onMouseDown={() => {
            // Mark that this is a user interaction
            isUserInteractionRef.current = true
          }}
          onClick={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full cursor-pointer",
            showChevron ? "pr-8" : "pr-4",
            // Use standard input padding (px-4 py-2.5) unless text-xs is specified
            className?.includes('text-xs') ? "px-2 py-1 text-xs" : "px-4 py-2.5",
            "bg-surface-800 border border-surface-700 rounded-lg text-white",
            "placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500",
            "transition-all duration-200"
          )}
          readOnly={!searchable}
        />
        {showChevron && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {allowClear && value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-surface-700 rounded transition-colors"
                tabIndex={-1}
              >
                <X className="w-4 h-4 text-surface-400" />
              </button>
            )}
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              className="p-1 hover:bg-surface-700 rounded transition-colors"
              tabIndex={-1}
            >
              <ChevronDown className={cn(
                'w-4 h-4 text-surface-400 transition-transform',
                isOpen && 'rotate-180'
              )} />
            </button>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-64 overflow-y-auto" 
          style={{ 
            position: 'fixed',
            zIndex: 999999,
            pointerEvents: 'auto',
            isolation: 'isolate'
          }}
          onMouseDown={(e) => {
            // Prevent the Sheet's click-outside handler from closing the dropdown
            e.stopPropagation()
          }}
          onClick={(e) => {
            // Prevent the Sheet's click-outside handler from closing the dropdown
            e.stopPropagation()
          }}
          onWheel={(e) => {
            // Allow scrolling
            e.stopPropagation()
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-surface-400 text-center">
              No options found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(option.value)
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(option.value)
                }}
                className={cn(
                  'w-full px-3 py-2 text-left hover:bg-surface-700 transition-colors',
                  'flex items-center gap-2',
                  value === option.value && 'bg-brand-500/10'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm',
                    value === option.value ? 'text-brand-400 font-medium' : 'text-white'
                  )}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-xs text-surface-400 mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
                {value === option.value && (
                  <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

