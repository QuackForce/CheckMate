# Prisma Relation Naming Reference

## Quick Reference

**Prisma generates capitalized relation names.** Always use these in:
- `include` statements
- `select` statements  
- Type definitions that match Prisma types

## Common Relations

### User Relations
- ✅ `User` (capitalized) - the User model relation
- ✅ `User_Client_primaryEngineerIdToUser` - Client's primary engineer
- ✅ `User_Client_secondaryEngineerIdToUser` - Client's secondary engineer
- ✅ `User_InfraCheck_assignedEngineerIdToUser` - Check's assigned engineer
- ✅ `User_InfraCheck_completedByIdToUser` - Check's completed by user

### Client Relations
- ✅ `Client` (capitalized) - the Client model relation
- ✅ `ClientEngineerAssignment` - Client's engineer assignments
- ✅ `ClientSystem` - Client's systems
- ✅ `ClientTeam` - Client's teams
- ✅ `InfraCheck` - Client's checks

### System Relations
- ✅ `System` (capitalized) - the System model relation
- ✅ `SystemCheckItem` - System's check items

### Team Relations
- ✅ `Team` (capitalized) - the Team model relation
- ✅ `UserTeam` - Team's users
- ✅ `ClientTeam` - Team's clients

### Other Relations
- ✅ `Account` - User's accounts (lowercase `accounts` in User model)
- ✅ `Session` - User's sessions (lowercase `sessions` in User model)
- ✅ `CategoryResult` - Check's category results
- ✅ `ItemResult` - Category's item results

## API Response Normalization

**Frontend components may expect lowercase names.** Normalize in API routes:

```typescript
// In API route
const client = await db.client.findUnique({
  include: {
    ClientEngineerAssignment: {
      include: { User: true } // Prisma uses capitalized
    }
  }
})

// Normalize for frontend
return {
  ...client,
  assignments: client.ClientEngineerAssignment.map(a => ({
    ...a,
    User: a.User, // Keep capitalized OR normalize to lowercase
  }))
}
```

## Common Mistakes

### ❌ Wrong: Using lowercase in Prisma queries
```typescript
include: {
  user: true,  // ❌ Wrong - Prisma expects User
  client: true, // ❌ Wrong - Prisma expects Client
}
```

### ✅ Correct: Using capitalized in Prisma queries
```typescript
include: {
  User: true,  // ✅ Correct
  Client: true, // ✅ Correct
}
```

### ❌ Wrong: Missing required fields
```typescript
await db.clientEngineerAssignment.create({
  data: {
    clientId: '...',
    userId: '...',
    role: ClientEngineerRole.SE,
    // Missing id and updatedAt!
  }
})
```

### ✅ Correct: Including all required fields
```typescript
await db.clientEngineerAssignment.create({
  data: {
    id: crypto.randomUUID(),
    clientId: '...',
    userId: '...',
    role: ClientEngineerRole.SE,
    updatedAt: new Date(),
  }
})
```

## Required Fields by Model

### ClientEngineerAssignment
- `id: string` (required)
- `updatedAt: Date` (required)

### ClientSystem
- `id: string` (required)
- `updatedAt: Date` (required)

### System
- `id: string` (required)
- `updatedAt: Date` (required)

### SystemCheckItem
- `id: string` (required)
- `updatedAt: Date` (required)

### InfraCheck
- `id: string` (required)
- `updatedAt: Date` (required)

### CategoryResult
- `id: string` (required)
- `updatedAt: Date` (required)

### ItemResult
- `id: string` (required)
- `updatedAt: Date` (required)

## Helper Functions

Use `src/lib/prisma-helpers.ts` for common operations:

```typescript
import { createAssignment, createAssignments } from '@/lib/prisma-helpers'

// Single assignment
const assignment = createAssignment({
  clientId: '...',
  userId: '...',
  role: ClientEngineerRole.SE,
})

// Multiple assignments
const assignments = createAssignments([
  { clientId: '...', userId: '...', role: ClientEngineerRole.SE },
  { clientId: '...', userId: '...', role: ClientEngineerRole.PRIMARY },
])
```

