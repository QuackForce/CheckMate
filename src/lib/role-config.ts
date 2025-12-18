/**
 * Centralized configuration for Client Engineer Roles
 * 
 * This file provides helper functions that read from the database (RoleConfiguration table).
 * Roles are managed through Settings > Roles in the UI.
 * 
 * Fallback: If database is unavailable, falls back to hardcoded config below.
 */

import { ClientEngineerRole } from '@prisma/client'
import { db } from './db'

export type RoleConfig = {
  /** Full display label (e.g., "System Engineer") */
  label: string
  /** Short abbreviation for compact displays (e.g., "SE") */
  abbreviation: string
  /** Background color class (e.g., "bg-brand-500/20") */
  bgColor: string
  /** Text color class (e.g., "text-brand-400") */
  textColor: string
  /** Border color class (e.g., "border-brand-500/30") */
  borderColor: string
  /** Display priority (lower = shown first, used for sorting) */
  priority: number
  /** Whether this role can have multiple assignments per client */
  allowMultiple: boolean
  /** Maximum number of assignments allowed (0 = unlimited) */
  maxAssignments: number
}

/**
 * Role configuration map
 * 
 * Priority order (lower = higher priority):
 * - SE (1) - System Engineer
 * - PRIMARY (2) - Primary Consultant
 * - SECONDARY (3) - Secondary Consultant
 * - GRCE (4) - GRCE Engineer
 * - IT_MANAGER (5) - IT Manager
 */
export const ROLE_CONFIG: Record<ClientEngineerRole, RoleConfig> = {
  SE: {
    label: 'System Engineer',
    abbreviation: 'SE',
    bgColor: 'bg-brand-500/20',
    textColor: 'text-brand-400',
    borderColor: 'border-brand-500/30',
    priority: 1,
    allowMultiple: true,
    maxAssignments: 4,
  },
  PRIMARY: {
    label: 'Primary Consultant',
    abbreviation: 'Primary',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    priority: 2,
    allowMultiple: true,
    maxAssignments: 4,
  },
  SECONDARY: {
    label: 'Secondary Consultant',
    abbreviation: 'Secondary',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    priority: 3,
    allowMultiple: true,
    maxAssignments: 4,
  },
  GRCE: {
    label: 'GRCE Engineer',
    abbreviation: 'GRCE',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    priority: 4,
    allowMultiple: true,
    maxAssignments: 4,
  },
  IT_MANAGER: {
    label: 'IT Manager',
    abbreviation: 'ITM',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/30',
    priority: 5,
    allowMultiple: true,
    maxAssignments: 4,
  },
  // Example: Add your new role here
  // JR_SYSTEM_ENGINEER: {
  //   label: 'Jr System Engineer',
  //   abbreviation: 'Jr SE',
  //   bgColor: 'bg-cyan-500/20',
  //   textColor: 'text-cyan-400',
  //   borderColor: 'border-cyan-500/30',
  //   priority: 6,
  //   allowMultiple: true,
  //   maxAssignments: 4,
  // },
}

// Cache for database roles (to avoid repeated queries)
let roleConfigCache: Map<string, RoleConfig> | null = null
let roleConfigCacheTime: number = 0
const CACHE_TTL = 60000 // 1 minute

/**
 * Load roles from database (with caching)
 */
async function loadRolesFromDatabase(): Promise<Map<string, RoleConfig>> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (roleConfigCache && (now - roleConfigCacheTime) < CACHE_TTL) {
    return roleConfigCache
  }

  try {
    const roles = await db.roleConfiguration.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    })

    const configMap = new Map<string, RoleConfig>()
    
    for (const role of roles) {
      configMap.set(role.roleKey, {
        label: role.label,
        abbreviation: role.abbreviation,
        bgColor: role.bgColor,
        textColor: role.textColor,
        borderColor: role.borderColor,
        priority: role.priority,
        allowMultiple: role.allowMultiple,
        maxAssignments: role.maxAssignments,
      })
    }

    // Update cache
    roleConfigCache = configMap
    roleConfigCacheTime = now
    
    return configMap
  } catch (error) {
    console.warn('Failed to load roles from database, using fallback:', error)
    // Return empty map, will fall back to hardcoded config
    return new Map()
  }
}

/**
 * Invalidate the role config cache (call after role updates)
 */
export function invalidateRoleConfigCache() {
  roleConfigCache = null
  roleConfigCacheTime = 0
}

/**
 * Get role configuration by role key (sync version - uses cache or fallback)
 */
export function getRoleConfig(role: ClientEngineerRole | string): RoleConfig | null {
  // Try cache first (if available)
  if (roleConfigCache) {
    const cached = roleConfigCache.get(role as string)
    if (cached) return cached
  }
  
  // Fall back to hardcoded config
  return ROLE_CONFIG[role as ClientEngineerRole] || null
}

/**
 * Get role configuration by role key (async version - loads from database)
 */
export async function getRoleConfigAsync(role: ClientEngineerRole | string): Promise<RoleConfig | null> {
  const dbConfig = await loadRolesFromDatabase()
  const config = dbConfig.get(role as string)
  
  if (config) return config
  
  // Fall back to hardcoded config
  return ROLE_CONFIG[role as ClientEngineerRole] || null
}

/**
 * Get role label (full name)
 */
export function getRoleLabel(role: ClientEngineerRole | string): string {
  return getRoleConfig(role)?.label || role
}

/**
 * Get role abbreviation
 */
export function getRoleAbbreviation(role: ClientEngineerRole | string): string {
  return getRoleConfig(role)?.abbreviation || role
}

/**
 * Get combined color classes for role badges
 * Returns: "bg-{color}/20 text-{color}-400 border-{color}-500/30"
 */
export function getRoleBadgeClasses(role: ClientEngineerRole | string): string {
  const config = getRoleConfig(role)
  if (!config) {
    return 'bg-surface-700 text-surface-400 border-surface-600'
  }
  return `${config.bgColor} ${config.textColor} ${config.borderColor}`
}

/**
 * Get all roles sorted by priority (sync - uses cache/fallback)
 */
export function getRolesByPriority(): ClientEngineerRole[] {
  if (roleConfigCache && roleConfigCache.size > 0) {
    return Array.from(roleConfigCache.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([roleKey]) => roleKey as ClientEngineerRole)
  }
  
  // Fall back to hardcoded
  return Object.entries(ROLE_CONFIG)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([role]) => role as ClientEngineerRole)
}

/**
 * Get all roles sorted by priority (async - loads from database)
 */
export async function getRolesByPriorityAsync(): Promise<string[]> {
  const dbConfig = await loadRolesFromDatabase()
  
  if (dbConfig.size > 0) {
    return Array.from(dbConfig.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([roleKey]) => roleKey)
  }
  
  // Fall back to hardcoded
  return Object.entries(ROLE_CONFIG)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([role]) => role)
}

/**
 * Get roles as options array for dropdowns/selects (sync)
 * Format: [{ value: 'SE', label: 'System Engineer' }]
 */
export function getRoleOptions(): Array<{ value: string; label: string }> {
  if (roleConfigCache && roleConfigCache.size > 0) {
    return Array.from(roleConfigCache.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([roleKey, config]) => ({
        value: roleKey,
        label: config.label,
      }))
  }
  
  // Fall back to hardcoded
  return getRolesByPriority().map(role => ({
    value: role,
    label: ROLE_CONFIG[role].label,
  }))
}

/**
 * Get roles as options array for dropdowns/selects (async)
 */
export async function getRoleOptionsAsync(): Promise<Array<{ value: string; label: string }>> {
  const dbConfig = await loadRolesFromDatabase()
  
  if (dbConfig.size > 0) {
    return Array.from(dbConfig.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([roleKey, config]) => ({
        value: roleKey,
        label: config.label,
      }))
  }
  
  // Fall back to hardcoded
  return getRolesByPriority().map(role => ({
    value: role,
    label: ROLE_CONFIG[role].label,
  }))
}

/**
 * Check if a role allows multiple assignments
 */
export function allowsMultipleAssignments(role: ClientEngineerRole | string): boolean {
  return getRoleConfig(role)?.allowMultiple ?? false
}

/**
 * Get maximum assignments allowed for a role
 * Returns 0 if unlimited
 */
export function getMaxAssignments(role: ClientEngineerRole | string): number {
  return getRoleConfig(role)?.maxAssignments ?? 0
}

/**
 * Validate if a role can accept more assignments
 */
export function canAddMoreAssignments(
  role: ClientEngineerRole | string,
  currentCount: number
): boolean {
  const max = getMaxAssignments(role)
  if (max === 0) return true // Unlimited
  return currentCount < max
}

