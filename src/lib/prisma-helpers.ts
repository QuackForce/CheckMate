/**
 * Prisma Helper Functions
 * 
 * These helpers prevent common TypeScript errors by:
 * 1. Automatically adding required fields (id, updatedAt)
 * 2. Ensuring correct types for Prisma operations
 * 3. Providing consistent patterns across the codebase
 */

import { randomUUID } from 'crypto'
import { ClientEngineerRole } from '@prisma/client'

/**
 * Create a ClientEngineerAssignment with all required fields
 */
export function createAssignment(data: {
  clientId: string
  userId: string
  role: ClientEngineerRole
}): {
  id: string
  clientId: string
  userId: string
  role: ClientEngineerRole
  updatedAt: Date
} {
  return {
    id: randomUUID(),
    ...data,
    updatedAt: new Date(),
  }
}

/**
 * Create multiple assignments with all required fields
 */
export function createAssignments(
  assignments: Array<{
    clientId: string
    userId: string
    role: ClientEngineerRole
  }>
): Array<{
  id: string
  clientId: string
  userId: string
  role: ClientEngineerRole
  updatedAt: Date
}> {
  return assignments.map(createAssignment)
}

/**
 * Helper to safely iterate over Map entries
 * Always use this instead of direct map.entries() iteration
 */
export function mapEntries<K, V>(map: Map<K, V>): Array<[K, V]> {
  return Array.from(map.entries())
}

/**
 * Helper to safely iterate over Set values
 * Always use this instead of direct set iteration
 */
export function setValues<T>(set: Set<T>): T[] {
  return Array.from(set)
}

/**
 * Helper to safely iterate over Map keys
 */
export function mapKeys<K>(map: Map<K, unknown>): K[] {
  return Array.from(map.keys())
}

/**
 * Helper to safely iterate over Map values
 */
export function mapValues<V>(map: Map<unknown, V>): V[] {
  return Array.from(map.values())
}

