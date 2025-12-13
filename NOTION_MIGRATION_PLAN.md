# Notion Migration Gameplan

## Goal
Prepare the application to operate independently of Notion, with the database as the single source of truth.

## Current State Analysis

### ✅ What's Already Working
- **ClientEngineerAssignment table** - New source of truth for engineer assignments (replaces legacy fields)
- **Client creation** - Can create clients without Notion (`notionPageId: null`)
- **Database-first architecture** - All queries use `ClientEngineerAssignment`, not legacy fields
- **UI for editing clients** - Edit page exists and works

### ⚠️ What Needs Work
- **Engineer assignment UI** - Still uses name fields instead of user selection
- **Notion name fields** - Still storing `systemEngineerName`, `primaryConsultantName`, etc. (redundant with assignments)
- **Sync dependency** - Some features assume Notion sync exists
- **Data entry** - No comprehensive UI for all client data entry

---

## Phase 1: Make Database the Source of Truth (Current → 2 weeks)

### 1.1 Update Client Edit UI to Use User Assignments
**Priority: HIGH**

**Current:** Edit page uses text fields for engineer names (`systemEngineerName`, `primaryConsultantName`, etc.)

**Target:** 
- Replace name text fields with user selection dropdowns
- Directly create/update `ClientEngineerAssignment` records
- Remove dependency on name matching

**Files to Update:**
- `src/app/(dashboard)/clients/[id]/edit/page.tsx`
- `src/app/api/clients/[id]/route.ts`

**Benefits:**
- No more name matching errors
- Direct user assignment
- Supports multiple SE/GRCE per client

### 1.2 Update Client Creation to Include Engineer Assignments
**Priority: HIGH**

**Current:** New client creation doesn't set engineer assignments

**Target:**
- Add engineer assignment UI to new client page
- Create `ClientEngineerAssignment` records on creation
- Set default infra check assignee

**Files to Update:**
- `src/app/(dashboard)/clients/new/page.tsx`
- `src/app/api/clients/route.ts` (POST handler)

### 1.3 Remove Notion Name Field Dependencies
**Priority: MEDIUM**

**Current:** Still storing and using `systemEngineerName`, `primaryConsultantName`, etc.

**Target:**
- Mark name fields as deprecated (keep for backward compatibility)
- Stop updating name fields in sync
- Use `ClientEngineerAssignment` exclusively

**Files to Update:**
- `src/lib/notion.ts` - Stop updating name fields
- `src/app/(dashboard)/clients/[id]/edit/page.tsx` - Remove name field inputs

---

## Phase 2: Enhance Data Entry & Management (Weeks 3-4)

### 2.1 Build Comprehensive Client Management UI
**Priority: MEDIUM**

**Features:**
- Bulk client operations (import, export, update)
- Client templates/duplication
- Data validation and required fields
- Audit trail (who changed what, when)

### 2.2 Engineer Assignment Management
**Priority: MEDIUM**

**Features:**
- Bulk assignment changes
- Assignment history/audit
- Role-based assignment rules
- Assignment templates

### 2.3 Data Import/Export
**Priority: LOW**

**Features:**
- Export clients to CSV/JSON
- Import clients from CSV
- Migration tools for Notion data export

---

## Phase 3: Remove Notion Dependencies (Weeks 5-6)

### 3.1 Make Notion Fields Optional
**Priority: HIGH**

**Changes:**
- Remove `notionPageId` uniqueness constraint (allow multiple clients without Notion)
- Make `notionLastSynced` nullable (already is)
- Update queries to not require `notionPageId`

**Schema Changes:**
```prisma
// Change from:
notionPageId String? @unique

// To:
notionPageId String? // Remove unique, make it just a reference field
```

### 3.2 Remove Notion Sync Requirements
**Priority: HIGH**

**Changes:**
- Make sync optional (feature flag)
- Remove "Sync from Notion" button requirement
- Allow app to function without Notion configured

**Files to Update:**
- `src/components/team/team-actions.tsx`
- `src/components/clients/refresh-button.tsx`
- All sync-related UI

### 3.3 Deprecate Notion Name Fields
**Priority: MEDIUM**

**Changes:**
- Keep fields in schema (for data migration period)
- Stop reading/writing to them
- Add migration path to remove them later

---

## Phase 4: Data Quality & Validation (Ongoing)

### 4.1 Required Fields & Validation
**Priority: MEDIUM**

**Add validation for:**
- Client name (required)
- At least one engineer assignment (SE or PRIMARY)
- Status transitions
- Data consistency checks

### 4.2 Data Completeness Checks
**Priority: LOW**

**Tools:**
- Admin dashboard showing data completeness
- Missing data reports
- Data quality metrics

---

## Implementation Priority

### Immediate (This Week)
1. ✅ Update client edit UI to use user assignments instead of names
2. ✅ Update client creation to set engineer assignments
3. ✅ Remove Notion name field updates from sync

### Short-term (Next 2 Weeks)
4. Make `notionPageId` non-unique
5. Add data validation
6. Build assignment management UI

### Medium-term (Next Month)
7. Bulk operations
8. Import/export tools
9. Audit trails

### Long-term (Future)
10. Remove Notion fields entirely
11. Advanced data management features

---

## Migration Strategy

### Option A: Big Bang Cutover
- Stop syncing from Notion
- Use app exclusively
- **Risk:** High if data is incomplete

### Option B: Gradual Migration (Recommended)
- Phase 1: Dual-write (write to both Notion and DB)
- Phase 2: Read from DB, write to both
- Phase 3: Read/write from DB only, Notion becomes read-only backup
- Phase 4: Disconnect Notion entirely

### Option C: Parallel Run
- Run both systems in parallel
- Compare outputs
- Gradually shift usage to app
- **Risk:** Medium, requires discipline

---

## Success Metrics

- [ ] Can create clients without Notion
- [ ] Can assign engineers without name matching
- [ ] All queries use `ClientEngineerAssignment` (no legacy fields)
- [ ] Notion sync is optional, not required
- [ ] Data quality is maintained
- [ ] No data loss during migration

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Export all Notion data first, keep backups |
| Name matching errors | Use user selection, not name fields |
| Missing data | Data completeness checks, validation |
| User confusion | Clear UI, training, documentation |
| Rollback needed | Keep Notion sync available as backup |

---

## Next Steps

1. **Start with Phase 1.1** - Update client edit UI (highest impact, lowest risk)
2. **Test thoroughly** - Ensure no data loss
3. **Iterate** - Get feedback, adjust plan
4. **Document** - Keep migration notes updated

