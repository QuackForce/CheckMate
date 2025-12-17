# TypeScript Error Prevention Guide

## Root Causes of Recurring Build Errors

### 1. **Prisma Relation Name Mismatch**
**Problem:** Prisma schema uses capitalized relation names (`User`, `Client`, `System`) but:
- Frontend components sometimes expect lowercase (`user`, `client`)
- API responses need normalization
- TypeScript strict mode catches these at build time, not dev time

**Solution:** Create a shared types file that normalizes Prisma types to frontend types.

### 2. **Missing Required Fields**
**Problem:** Prisma schema requires `id` and `updatedAt` for many models, but:
- Dev server doesn't catch missing fields until build
- Easy to forget when creating new records

**Solution:** Create helper functions that automatically add required fields.

### 3. **TypeScript Iteration Issues**
**Problem:** Maps and Sets require `Array.from()` in strict mode, but:
- Dev server doesn't always catch these
- Build process uses stricter checking

**Solution:** Always use `Array.from()` when iterating Maps/Sets.

### 4. **No Pre-Commit Type Checking**
**Problem:** Errors only discovered during `npm run build` on Vercel.

**Solution:** Add type checking to pre-commit hooks and CI.

---

## Solutions

### Solution 1: Shared Type Normalization

Create `src/types/prisma-normalized.ts`:

```typescript
// Normalize Prisma types to frontend-friendly types
export type NormalizedClient = Omit<Client, 'User' | 'Client'> & {
  assignments?: Array<{
    id: string
    userId: string
    role: string
    User: {
      id: string
      name: string | null
      email: string | null
      image: string | null
    } | null
  }>
}

// Helper to normalize API responses
export function normalizeClient(client: any): NormalizedClient {
  return {
    ...client,
    assignments: client.assignments || client.ClientEngineerAssignment || [],
  }
}
```

### Solution 2: Prisma Helper Functions

Create `src/lib/prisma-helpers.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

// Helper to create records with required fields
export function createWithDefaults<T extends { id: string; updatedAt: Date }>(
  data: Omit<T, 'id' | 'updatedAt'>
): T {
  return {
    ...data,
    id: randomUUID(),
    updatedAt: new Date(),
  } as T
}

// Helper for ClientEngineerAssignment
export function createAssignment(data: {
  clientId: string
  userId: string
  role: string
}) {
  return {
    id: randomUUID(),
    ...data,
    updatedAt: new Date(),
  }
}
```

### Solution 3: Pre-Commit Type Checking

Add to `package.json`:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run type-check && npm run lint"
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0"
  }
}
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run type-check
```

### Solution 4: Development Workflow

**Before committing:**
1. Run `npm run type-check` locally
2. Run `npm run build` to catch build-time errors
3. Fix any errors before committing

**Best Practices:**
- Always use Prisma's generated types (import from `@prisma/client`)
- Use `Array.from()` when iterating Maps/Sets
- Check Prisma schema for required fields before creating records
- Normalize API responses to match frontend expectations

---

## Quick Reference: Common Patterns

### ✅ Correct: Prisma Relations
```typescript
// In Prisma queries
include: {
  User: { select: { name: true } },  // Capitalized
  Client: { select: { name: true } }, // Capitalized
}

// In API responses - normalize for frontend
return {
  ...client,
  assignments: client.ClientEngineerAssignment.map(a => ({
    ...a,
    User: a.User, // Keep capitalized or normalize
  }))
}
```

### ✅ Correct: Required Fields
```typescript
// Always include id and updatedAt
await db.clientEngineerAssignment.create({
  data: {
    id: crypto.randomUUID(),
    clientId: '...',
    userId: '...',
    role: ClientEngineerRole.SE,
    updatedAt: new Date(), // Required!
  }
})
```

### ✅ Correct: Map/Set Iteration
```typescript
// Always use Array.from()
for (const [key, value] of Array.from(map.entries())) {
  // ...
}

for (const item of Array.from(set)) {
  // ...
}
```

### ❌ Wrong: Missing Required Fields
```typescript
// Missing id and updatedAt
await db.clientEngineerAssignment.create({
  data: {
    clientId: '...',
    userId: '...',
    role: ClientEngineerRole.SE,
    // Missing id and updatedAt!
  }
})
```

### ❌ Wrong: Direct Map Iteration
```typescript
// Will fail in strict mode
for (const [key, value] of map.entries()) {
  // ...
}
```

---

## Action Items

1. ✅ Create shared type normalization utilities
2. ✅ Create Prisma helper functions for common operations
3. ✅ Add pre-commit hooks for type checking
4. ✅ Document Prisma relation naming conventions
5. ✅ Add type-check script to package.json
6. ✅ Run `npm run type-check` before every commit

