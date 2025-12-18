# Compliance Management Features

This document outlines the compliance management features for audit period tracking, access review scheduling, and compliance timeline management.

---

## Overview

These features enable GRC (Governance, Risk, and Compliance) analysts and System Engineers to manage compliance activities for clients, specifically supporting SOC 2, ISO 27001, and HIPAA compliance requirements.

---

## 1. Audit Period Tracking

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Medium

### Description
Track audit periods for compliance frameworks (SOC 2, ISO 27001, HIPAA) with reminders, status tracking, and evidence linking.

### Requirements

#### Framework-Specific Defaults
- **SOC 2:** Annual audits (Type I/Type II)
- **ISO 27001:** 
  - Annual surveillance audits
  - 3-year recertification audits (separate tracking)
- **HIPAA:** Annual risk assessments

#### Features
- Manual entry of last audit date
- Auto-calculate next audit due date (but editable - audits don't always finish on time)
- Track actual completion date (may differ from scheduled)
- Status tracking: SCHEDULED, IN_PROGRESS, COMPLETED, OVERDUE
- Evidence link (URL to audit report/documentation)
- Notes field
- Auditor name/company tracking
- Slack reminders (30 days, 14 days, 7 days before due date, and overdue)

#### UI Location
- **Primary:** Compliance tab on client detail page
- **View:** Expandable section showing all audit periods
- **Actions:** Add, Edit, Link Evidence, View History

#### Workflow
1. Add audit period:
   - Select framework (SOC 2, ISO 27001, HIPAA)
   - Select audit type (Type I, Type II, Surveillance, Recertification, Risk Assessment)
   - Enter last audit completion date
   - System suggests next due date (editable)
   - Enter auditor (optional)
   - Save

2. Update audit:
   - Mark as in progress when audit starts
   - Update actual completion date (may differ from scheduled)
   - Link evidence (URL to audit report)
   - Add notes
   - System auto-calculates next audit due date from actual completion

3. Reminders:
   - Slack notifications at 30, 14, 7 days before due
   - Overdue notifications
   - Completion notifications

### Database Schema

```prisma
model ComplianceAudit {
  id              String   @id @default(cuid())
  clientId        String
  framework       String   // "SOC2", "ISO27001", "HIPAA"
  auditType       String   // "Type I", "Type II", "Surveillance", "Recertification", "Risk Assessment"
  lastAuditDate   DateTime // When last audit was completed
  auditPeriod     Int      // Period in months (12 for annual, 36 for 3-year)
  nextAuditDue    DateTime // Calculated: lastAuditDate + auditPeriod, but editable
  actualDate      DateTime? // When audit actually happened (may differ from scheduled)
  status          String   // "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"
  auditor         String?  // Auditor name/company
  evidenceUrl     String?  // Link to audit report
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdById     String?  // Who created this audit period
  updatedById     String?  // Who last updated
  
  Client          Client   @relation("ComplianceAudits", fields: [clientId], references: [id], onDelete: Cascade)
  CreatedBy       User?    @relation("CreatedAudits", fields: [createdById], references: [id])
  UpdatedBy       User?    @relation("UpdatedAudits", fields: [updatedById], references: [id])
  
  @@index([clientId])
  @@index([framework])
  @@index([status])
  @@index([nextAuditDue])
}
```

### Permissions
- **Can Manage:** GRC Engineers (GRCE role) and System Engineers (SE role)
- **Can View:** All users with client access

---

## 2. Access Review Scheduling & Execution

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Medium-High

### Description
Schedule and execute quarterly (or custom cadence) access reviews for compliance frameworks. Simpler than infra checks but with similar scheduling and tracking capabilities.

### Requirements

#### Default Cadence
- **Default:** Quarterly for all frameworks
- **Framework-Specific Overrides:** Configurable (e.g., HIPAA = semi-annual)
- **Per-Client Override:** Optional customization per client

#### Features
- Schedule reviews (quarterly, semi-annual, annual, custom)
- Assign to user (typically GRC Engineer owns, IT Engineer completes)
- Track completion status
- Evidence link (URL to review documentation - often Google Doc)
- Notes field
- Time tracking (similar to infra checks)
- Auto-schedule next review option (on completion)
- Audit trail (who completed, when, changes made)
- Keep 2 years of review history
- Slack reminders (14 days, 7 days before due, overdue)

#### UI Location

**Scheduling/Viewing:**
- Compliance tab on client detail page
- List of upcoming/completed reviews
- Quick status view

**Execution:**
- Dedicated page: `/clients/[clientId]/access-reviews/[reviewId]`
- Similar to infra checks page but simpler
- Focused workflow for completion

#### Workflow

1. **Schedule Review:**
   - Click "Schedule Review" in Compliance tab
   - Select framework (optional - can be general)
   - Select cadence (Quarterly, Semi-Annual, Annual, Custom)
   - Set due date
   - Assign to user (GRC Engineer typically)
   - Save

2. **Execute Review:**
   - Navigate to review page from Compliance tab
   - Start timer (optional)
   - Add evidence link (URL to review documentation)
   - Add notes
   - Mark as completed
   - On completion: Option to auto-schedule next review

3. **Auto-Scheduling:**
   - On completion, show modal:
     - ☑ Auto-schedule next quarter (default)
     - ○ Schedule manually later
     - ○ Don't schedule (one-off review)

4. **Reminders:**
   - Slack notifications at 14, 7 days before due
   - Overdue notifications
   - Completion notifications

### Database Schema

```prisma
model AccessReview {
  id              String   @id @default(cuid())
  clientId        String
  framework       String?  // "SOC2", "ISO27001", "HIPAA", or null for general
  reviewDate      DateTime // When review is scheduled/due
  dueDate         DateTime
  cadence         String   // "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "CUSTOM"
  customDays      Int?     // For custom cadence
  status          String   // "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"
  assignedToId    String?  // User ID (typically GRC Engineer)
  completedById   String?  // User ID (who actually completed it)
  completedAt     DateTime? // When it was completed
  evidenceUrl     String?  // Link to review report/documentation
  notes           String?
  totalTimeSeconds Int     @default(0) // Time spent on review
  autoSchedule    Boolean  @default(true) // Whether to auto-schedule next
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Client          Client   @relation("AccessReviews", fields: [clientId], references: [id], onDelete: Cascade)
  AssignedTo      User?    @relation("AssignedAccessReviews", fields: [assignedToId], references: [id])
  CompletedBy     User?    @relation("CompletedAccessReviews", fields: [completedById], references: [id])
  
  // Audit trail
  AuditLog        AccessReviewAuditLog[]
  TimerSession    AccessReviewTimerSession[]
  
  @@index([clientId])
  @@index([reviewDate])
  @@index([status])
  @@index([assignedToId])
  @@index([framework])
  @@index([completedAt])
}

// Audit trail for access reviews
model AccessReviewAuditLog {
  id              String   @id @default(cuid())
  reviewId        String
  action          String   // "CREATED", "UPDATED", "COMPLETED", "EVIDENCE_ADDED", "NOTES_UPDATED"
  field           String?  // Which field was changed
  oldValue        String?  // Previous value
  newValue        String?  // New value
  userId          String   // Who made the change
  timestamp       DateTime @default(now())
  notes           String?  // Additional context
  
  Review          AccessReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  User            User         @relation(fields: [userId], references: [id])
  
  @@index([reviewId])
  @@index([userId])
  @@index([timestamp])
}

// Time tracking for access reviews
model AccessReviewTimerSession {
  id              String   @id @default(cuid())
  reviewId        String
  userId          String
  startTime       DateTime
  endTime         DateTime?
  durationSeconds Int?     // Calculated duration
  notes           String?
  
  Review          AccessReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  User            User         @relation(fields: [userId], references: [id])
  
  @@index([reviewId])
  @@index([userId])
}
```

### Permissions
- **Can Manage:** GRC Engineers (GRCE role) and System Engineers (SE role)
- **Can Complete:** Assigned user or any GRC/SE
- **Can View:** All users with client access

### History Retention
- Keep 2 years of access review history
- Auto-archive older reviews (optional cleanup job)

---

## 3. Compliance Timeline Management

**Status:** 📋 Planned  
**Priority:** Medium  
**Complexity:** Low-Medium

### Description
Visual timeline view of all compliance activities (audits and access reviews) across frameworks, showing what's due when.

### Requirements

#### Features
- Unified view of all compliance activities
- Visual timeline/calendar view
- Filter by framework (SOC 2, ISO 27001, HIPAA, All)
- Show upcoming items (next 90 days)
- Show overdue items
- Historical view (past 2 years)
- Color coding by status (upcoming, in progress, completed, overdue)
- Click to view/edit details

#### UI Location
- **Primary:** Compliance tab on client detail page (compact view)
- **Expanded:** Full timeline view (modal or separate view)
- **Link:** "View Full Timeline" from Compliance tab

#### Views

1. **Compact Timeline (Compliance Tab):**
   - Next 6 months of activities
   - Upcoming audits/reviews
   - Overdue items highlighted
   - Quick status indicators

2. **Full Timeline View:**
   - Calendar/timeline visualization
   - Filter by framework
   - Filter by activity type (audits, reviews, all)
   - Historical view (past 2 years)
   - Export option (future enhancement)

### Implementation
- Reuse existing calendar/timeline components if available
- Or build simple timeline component
- Aggregate data from ComplianceAudit and AccessReview tables

---

## 4. Slack Notifications

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Low-Medium

### Description
Slack reminders and notifications for compliance activities, similar to infra check notifications.

### Notification Types

#### Audit Reminders
- 30 days before audit due date
- 14 days before audit due date
- 7 days before audit due date
- Overdue notification (daily until completed)

#### Access Review Reminders
- 14 days before review due date
- 7 days before review due date
- Overdue notification (daily until completed)

#### Completion Notifications
- Audit completed (notify team)
- Access review completed (notify assigned user/team)

### Implementation
- Reuse existing Slack notification infrastructure
- Similar to infra check reminder system
- Respect user notification preferences

---

## Implementation Priority

### Phase 1: Core Tracking (MVP)
1. ✅ Audit period tracking (add, edit, track status)
2. ✅ Access review scheduling (schedule, assign, track)
3. ✅ Access review execution page (simple form with link + notes)
4. ✅ Compliance timeline (compact view in Compliance tab)

### Phase 2: Notifications
5. ✅ Slack reminders for audits and reviews
6. ✅ Completion notifications

### Phase 3: Enhancements
7. ⏳ Time tracking for access reviews
8. ⏳ Audit trail tracking
9. ⏳ Full timeline view (expanded)
10. ⏳ Framework-specific cadence settings

---

## Database Schema Summary

### New Models
- `ComplianceAudit` - Audit period tracking
- `AccessReview` - Access review scheduling and execution
- `AccessReviewAuditLog` - Audit trail for reviews
- `AccessReviewTimerSession` - Time tracking for reviews

### Schema Updates
- Add relations to `Client` model:
  - `ComplianceAudit[]`
  - `AccessReview[]`
- Add relations to `User` model:
  - `CreatedAudits`
  - `UpdatedAudits`
  - `AssignedAccessReviews`
  - `CompletedAccessReviews`
  - `AccessReviewAuditLog[]`
  - `AccessReviewTimerSession[]`

---

## UI Components

### New Components
- `ComplianceAuditSection` - Audit periods list and management
- `AccessReviewSection` - Access reviews list and scheduling
- `ComplianceTimeline` - Timeline visualization
- `AccessReviewPage` - Dedicated review execution page
- `AccessReviewForm` - Review completion form
- `AuditPeriodForm` - Add/edit audit period form

### Updated Components
- `ClientCompliance` - Expand to include new sections
- `ClientDetailView` - Ensure Compliance tab has space for new content

---

## API Endpoints

### New Endpoints
- `GET /api/clients/[id]/compliance/audits` - Get audit periods
- `POST /api/clients/[id]/compliance/audits` - Create audit period
- `PATCH /api/clients/[id]/compliance/audits/[auditId]` - Update audit period
- `DELETE /api/clients/[id]/compliance/audits/[auditId]` - Delete audit period

- `GET /api/clients/[id]/access-reviews` - Get access reviews
- `POST /api/clients/[id]/access-reviews` - Schedule access review
- `GET /api/access-reviews/[id]` - Get single review
- `PATCH /api/access-reviews/[id]` - Update review
- `POST /api/access-reviews/[id]/complete` - Mark review as completed
- `GET /api/access-reviews/[id]/audit-log` - Get audit trail
- `POST /api/access-reviews/[id]/timer/start` - Start timer
- `POST /api/access-reviews/[id]/timer/stop` - Stop timer

---

## Permissions

### Permission Checks
```typescript
const canManageCompliance = 
  role === 'GRCE' || 
  role === 'SE' || 
  hasPermission(role, 'compliance:manage')
```

### Actions
- **View Compliance:** All users with client access
- **Manage Audits:** GRCE, SE
- **Manage Access Reviews:** GRCE, SE
- **Complete Reviews:** Assigned user, GRCE, SE
- **View Audit Trail:** GRCE, SE, ADMIN

---

## Considerations

### Data Retention
- Keep 2 years of access review history
- Keep all audit period history (minimal data)
- Consider archival strategy for older data

### Framework-Specific Defaults
- SOC 2: Annual audits, Quarterly access reviews
- ISO 27001: Annual surveillance + 3-year recert, Quarterly access reviews
- HIPAA: Annual risk assessments, Quarterly access reviews (or semi-annual if preferred)

### Cadence Management
- Default: Quarterly for all frameworks
- Framework-specific overrides: Configurable in settings
- Per-client overrides: Optional customization

### Integration Points
- Reuse infra check scheduling infrastructure
- Reuse Slack notification system
- Reuse time tracking system (Harvest integration)
- Reuse calendar integration (Google Calendar)

---

## Related Files

- `src/components/clients/client-compliance.tsx` - Compliance tab component
- `src/app/(dashboard)/clients/[id]/page.tsx` - Client detail page
- `src/app/(dashboard)/clients/[id]/access-reviews/[id]/page.tsx` - Access review execution page
- `src/lib/slack-notifications.ts` - Slack notification utilities
- `prisma/schema.prisma` - Database schema

---

**Last Updated:** December 2024

