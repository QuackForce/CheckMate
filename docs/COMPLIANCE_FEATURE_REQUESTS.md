# Compliance Feature Requests

This document outlines feature requests and enhancements for the compliance management system based on analysis of the current audit tracker workflow.

---

## Overview

After analyzing the existing audit tracker spreadsheet, several fields and features were identified that would enhance the compliance management system to better match real-world workflows.

---

## 1. Audit Phase/Stage Tracking

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Low

### Description
Add granular audit phase tracking beyond simple status (SCHEDULED/IN_PROGRESS/COMPLETED) to track the audit lifecycle stage.

### Current State
- System tracks: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`
- Audit tracker uses: `Observation`, `Audit`, `N/A`, `Implementation`, `Reworking`

### Proposed Solution
Add `auditPhase` enum field to `ComplianceAudit` model:
- `OBSERVATION` - Client is in observation period (post-audit, pre-renewal)
- `AUDIT` - Active audit in progress
- `IMPLEMENTATION` - Implementing controls/remediation
- `REWORKING` - Re-audit or rework required
- `N_A` - Not applicable (e.g., frameworks where JIT is not involved)

### Benefits
- Better visibility into where each audit is in its lifecycle
- More accurate filtering and reporting
- Aligns with existing workflow terminology

### Database Changes
```prisma
model ComplianceAudit {
  // ... existing fields
  auditPhase String? // "OBSERVATION", "AUDIT", "IMPLEMENTATION", "REWORKING", "N_A"
  // ... rest of fields
}
```

### UI Changes
- Add phase selector in audit form
- Display phase badge alongside status
- Filter audits by phase on compliance page
- Update status logic to work with phases

---

## 2. Involvement Level Tracking

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Low

### Description
Track JIT's level of involvement in each audit to understand resource allocation and client engagement.

### Current State
- No involvement tracking at audit level
- Only tracks assigned engineers via `ClientEngineerAssignment`

### Proposed Solution
Add `involvementLevel` enum field:
- `FULLY_MANAGED` - JIT manages the entire audit process
- `CO_MANAGED` - JIT works alongside client team
- `NOT_INVOLVED` - JIT is not involved in this audit

### Benefits
- Better resource planning and allocation
- Understand which audits require JIT attention
- Filter audits by involvement level
- Reporting on workload distribution

### Database Changes
```prisma
model ComplianceAudit {
  // ... existing fields
  involvementLevel String? // "FULLY_MANAGED", "CO_MANAGED", "NOT_INVOLVED"
  // ... rest of fields
}
```

### UI Changes
- Add involvement level selector in audit form
- Display involvement badge on audit cards
- Filter by involvement level on compliance page
- Stats showing distribution of involvement levels

---

## 3. JIT Team Assignment to Audits

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Medium

### Description
Assign specific JIT team members to audits (beyond general client assignments) to track who is working on each audit.

### Current State
- Team members assigned at client level via `ClientEngineerAssignment`
- No audit-specific assignments
- CSV shows multiple JIT contacts per audit (e.g., "Anfernee Lai, Michael Lemay")

### Proposed Solution
**Option A:** Create dedicated `AuditAssignment` model
```prisma
model AuditAssignment {
  id        String   @id @default(cuid())
  auditId   String
  userId    String
  role      String?  // "Lead", "Support", etc.
  createdAt DateTime @default(now())
  
  Audit     ComplianceAudit @relation(fields: [auditId], references: [id], onDelete: Cascade)
  User      User            @relation(fields: [userId], references: [id])
  
  @@unique([auditId, userId])
  @@index([auditId])
  @@index([userId])
}
```

**Option B:** Use existing `ClientEngineerAssignment` with a compliance-specific role
- Simpler, but less granular
- Can't track audit-specific assignments separately from client assignments

### Recommendation
**Option A** - More flexible and allows for audit-specific assignments that may differ from general client assignments.

### Benefits
- Clear visibility of who is working on each audit
- Better workload distribution
- Filter audits by assigned team member
- "My Audits" view for individual team members

### UI Changes
- Multi-select team member assignment in audit form
- Display assigned team members on audit cards
- Filter audits by assigned team member
- "My Audits" filter on compliance page

---

## 4. Compliance Contact Information

**Status:** 📋 Planned  
**Priority:** Medium  
**Complexity:** Low

### Description
Track the client's compliance contact person for each audit to facilitate communication.

### Current State
- No compliance contact tracking
- CSV shows email addresses like "anfernee.lai@itjones.com"

### Proposed Solution
Add fields to `ComplianceAudit` model:
- `complianceContactName` (String, optional)
- `complianceContactEmail` (String, optional)

**Alternative:** Add to `Client` model if same contact for all audits
- Simpler, but less flexible if different contacts per audit/framework

### Recommendation
Add to `ComplianceAudit` model for flexibility (different contacts per audit/framework).

### Benefits
- Quick access to client contact information
- Better communication tracking
- Can link to email/communication tools

### Database Changes
```prisma
model ComplianceAudit {
  // ... existing fields
  complianceContactName  String?
  complianceContactEmail String?
  // ... rest of fields
}
```

### UI Changes
- Add contact fields in audit form
- Display contact info on audit cards
- Click-to-email functionality
- Contact info in audit details view

---

## 5. Hours Tracking

**Status:** 📋 Planned  
**Priority:** Medium  
**Complexity:** Low

### Description
Track estimated and remaining hours for audit work to better manage resource allocation and project planning.

### Current State
- No hours tracking
- CSV shows "Hours Remaining" column with values like 25, 50, 150, 200

### Proposed Solution
Add fields to `ComplianceAudit` model:
- `estimatedTotalHours` (Int, optional) - Total estimated hours for the audit
- `hoursRemaining` (Int, optional) - Remaining hours to complete
- `hoursLogged` (Int, optional) - Actual hours logged (could integrate with Harvest)

### Benefits
- Better resource planning
- Track progress on audit work
- Integration with time tracking tools (Harvest)
- Reporting on audit effort

### Database Changes
```prisma
model ComplianceAudit {
  // ... existing fields
  estimatedTotalHours Int?
  hoursRemaining      Int?
  hoursLogged         Int?
  // ... rest of fields
}
```

### UI Changes
- Add hours fields in audit form
- Display hours remaining on audit cards
- Progress indicator (hours logged vs. estimated)
- Filter audits by hours remaining (e.g., "High effort" audits)

---

## 6. Observation Period Tracking

**Status:** 📋 Planned  
**Priority:** Medium  
**Complexity:** Low

### Description
Track the observation period for audits (e.g., "April 1, 2024 → March 31, 2026") which represents the period covered by the audit.

### Current State
- Only tracks `lastAuditDate` and `nextAuditDue`
- CSV shows date ranges like "April 1, 2024 → March 31, 2026"

### Proposed Solution
Add fields to `ComplianceAudit` model:
- `observationStartDate` (DateTime, optional)
- `observationEndDate` (DateTime, optional)

### Benefits
- Clear visibility of audit coverage period
- Better understanding of audit scope
- Reporting on observation periods

### Database Changes
```prisma
model ComplianceAudit {
  // ... existing fields
  observationStartDate DateTime?
  observationEndDate   DateTime?
  // ... rest of fields
}
```

### UI Changes
- Add date range picker in audit form
- Display observation period on audit cards
- Show observation period in audit details

---

## 7. Renewal Status Tracking

**Status:** 📋 Planned  
**Priority:** Low  
**Complexity:** Low

### Description
Track renewal status for audits to understand engagement lifecycle (First Time, Renewing, Discussing, Dropped).

### Current State
- No renewal status tracking
- CSV shows values: "Renewing", "First Time", "Discussing", "Dropped"

### Proposed Solution
Add `renewalStatus` enum field:
- `FIRST_TIME` - First audit for this client/framework
- `RENEWING` - Renewal of existing audit
- `DISCUSSING` - In discussion phase
- `DROPPED` - Audit was dropped/cancelled

**Question:** Should this be at audit level or client level?
- **Audit level:** More granular (different status per framework)
- **Client level:** Simpler, but less flexible

### Recommendation
**Audit level** - Allows different renewal statuses for different frameworks per client.

### Benefits
- Track engagement lifecycle
- Identify new vs. existing clients
- Filter by renewal status
- Reporting on client retention

### Database Changes
```prisma
model ComplianceAudit {
  // ... existing fields
  renewalStatus String? // "FIRST_TIME", "RENEWING", "DISCUSSING", "DROPPED"
  // ... rest of fields
}
```

### UI Changes
- Add renewal status selector in audit form
- Display renewal status badge on audit cards
- Filter by renewal status
- Stats showing renewal vs. first-time audits

---

## Implementation Priority

### Phase 1 (High Priority - Core Workflow)
1. ✅ Audit Phase/Stage Tracking
2. ✅ Involvement Level Tracking
3. ✅ JIT Team Assignment to Audits

### Phase 2 (Medium Priority - Enhanced Tracking)
4. ✅ Compliance Contact Information
5. ✅ Hours Tracking
6. ✅ Observation Period Tracking

### Phase 3 (Lower Priority - Nice to Have)
7. ✅ Renewal Status Tracking

---

## Open Questions

1. **Audit Phase vs. Status:** Should "Observation" be a separate phase, or a status within "Audit"? 
   - **Recommendation:** Separate phase - it represents a different stage in the lifecycle

2. **JIT Contacts:** Should this be many-to-many relation or comma-separated string?
   - **Recommendation:** Many-to-many relation (`AuditAssignment` model) for better querying and filtering

3. **Hours Remaining:** Is this estimated hours for JIT work, or total audit hours?
   - **Recommendation:** JIT work hours (aligns with resource planning needs)

4. **Renewal Status:** Per audit or per client?
   - **Recommendation:** Per audit (allows different statuses per framework)

5. **Compliance Contact:** Per audit or per client?
   - **Recommendation:** Per audit (allows different contacts per framework/audit)

---

## Related Features

- Integration with Harvest for hours logging
- "My Audits" filter on compliance page
- Enhanced reporting and analytics
- Email integration for compliance contacts
- Audit assignment notifications

---

## Notes

- All proposed fields are optional to maintain backward compatibility
- Consider migration strategy for existing audit records
- UI should gracefully handle missing data
- Consider bulk import functionality for migrating from CSV

