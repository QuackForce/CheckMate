# Feature Requests

This document tracks feature requests from users and planned enhancements for future implementation.

---

## 1. Ability to Edit/Override Slack Message

**Status:** 📋 Planned  
**Priority:** Medium  
**Complexity:** Medium

### Description
Allow users to customize or override the default Slack messages sent for infrastructure checks. This would enable more personalized communication and context-specific messaging.

### Current State
- Slack messages are sent via `/api/slack/post` endpoint
- Messages are generated programmatically in code (e.g., `notifyCheckAssigned`, reminder notifications)
- Message content is built dynamically, not stored
- `slackMessageTs` field exists in `InfraCheck` model to track when messages were sent

### Implementation Approach
- **Database Changes:**
  - Add `customSlackMessage` field to `InfraCheck` model (nullable `String?`)
  - Store custom message text per check

- **UI Changes:**
  - Add "Edit Slack Message" button/modal in check execution view
  - Allow editing before sending or overriding after sending
  - Show preview of message before sending

- **Features:**
  - Support placeholders/variables (e.g., `{clientName}`, `{scheduledDate}`, `{assignedEngineer}`)
  - Fallback to default message if custom message is empty
  - Template system for common message patterns

### Considerations
- **When to allow editing:** Before first send only? After send (override)? Both? - both
- **Scope:** Apply to all Slack notifications or only main check completion message? - check completion
- **Templates:** Should we provide pre-built templates or just free-form text? - free form works for now
- **Placeholders:** Which variables should be available for substitution? - I think we should not allow changing of the client name, date, or assigned engineer this should be what is on the check. I think what could be changed is maybe some material or notes in the body.

### Related Files
- `src/app/api/slack/post/route.ts` - Slack message posting
- `src/lib/slack-notifications.ts` - Notification functions
- `src/components/checks/check-execution.tsx` - Check execution UI
- `prisma/schema.prisma` - InfraCheck model

---

## 2. Checks Page Redesign: Tabs + "My Clients" Default

**Status:** ✅ Completed  
**Priority:** High  
**Complexity:** Medium

### Description
Redesign the checks page with tab-based organization and "My Clients" as the default view to reduce clutter and improve focus on actionable items. This addresses the scaling issue where multiple checks per client across different statuses create visual clutter.

### Current State
- Checks page (`/checks`) has single list with status filter dropdown
- Shows all checks (completed, in progress, scheduled, overdue) in one view
- Can have multiple checks for same client in different states (cluttered)
- `ChecksTabs` component exists but appears unused
- Clients page already has `assignee=me` filtering functionality
- Client assignments are tracked in `ClientEngineerAssignment` table with roles (SE, PRIMARY, SECONDARY, GRCE, IT_MANAGER)

### User Research Insights
- **Completed checks usage:** Rarely needed (mainly for reference when fixing issues)
- **Primary actions:** Combination of start/continue checks, review what's due, and plan ahead
- **Default view preference:** "My Clients" should be default to reduce clutter and focus on relevant work
- **Completed checks display:** Show last 2-3 per client (quantity-based, not time-based) to keep it clean

### Proposed Implementation

#### Tab Structure
1. **Active** (Default Tab)
   - Shows: Overdue + In Progress + Today
   - Organization: Flat chronological list, sorted by priority (Overdue → In Progress → Today)
   - Grouping: None (actionable items need quick scanning)
   - "My Clients" filter: Applied by default, can be toggled off

2. **Upcoming**
   - Shows: Scheduled checks (future dates)
   - Organization: Grouped by date ranges
     - This Week
     - Next Week
     - This Month
     - Next Month
   - Grouping: Date-based (planning view)
   - "My Clients" filter: Applied by default, can be toggled off

3. **Completed**
   - Shows: Last 2-3 completed checks per client (quantity-based, not time-based)
   - Organization: Grouped by client
   - Grouping: Client-based (reference view)
   - Expandable: "Show all X completed checks" per client for deeper history
   - "My Clients" filter: Applied by default, can be toggled off

4. **All** (Optional - for admins/power users)
   - Shows: Everything across all statuses
   - Organization: Flat chronological list
   - "My Clients" filter: Optional (not default)

#### "My Clients" Filter
- **Permission-Based Behavior:**
  - **ADMIN / IT_MANAGER** (`checks:view_all`):
    - Default: OFF (see all checks for oversight)
    - Toggle: Visible, can toggle ON/OFF
    - Use case: Managers need to see everything but can focus on their own work
  
  - **IT_ENGINEER / CONSULTANT** (`checks:view_own` only):
    - Default: Always ON (can only see their own checks)
    - Toggle: Hidden (always filtered to their clients)
    - Use case: Engineers/consultants only see their assigned clients
  
  - **VIEWER** (no check permissions):
    - Cannot access checks page (or read-only if allowed)

- **UI Pattern:** Toggle button with badge showing count (only visible if user has `checks:view_all`)
- **Filter Logic:**
  - Show checks where:
    - User is the assigned engineer (`assignedEngineerId = userId`), OR
    - Check's client has user in `ClientEngineerAssignment` (any role)
- **Works with:** All tabs and existing search filter
- **Can be toggled:** Only for users with `checks:view_all` permission

#### Grouping Strategy by Tab

**Active Tab:**
- Flat list, no grouping
- Sorted by: Priority (Overdue → In Progress → Today) then by date
- Rationale: Actionable items need quick scanning, grouping adds friction

**Upcoming Tab:**
- Grouped by date ranges (This Week, Next Week, This Month, Next Month)
- Rationale: Planning is time-based, helps see workload distribution

**Completed Tab:**
- Grouped by client
- Show 2-3 most recent per client
- Expandable sections: "Show all X completed checks" per client
- Rationale: Reference is client-centric, easy to see recent history per client

### Implementation Details

#### Database/API Changes
- Update `/api/checks` GET endpoint:
  - Accept `tab` parameter: `active`, `upcoming`, `completed`, `all`
  - Accept `assignee=me` parameter:
    - Default: `true` for users with only `checks:view_own` (always filtered)
    - Default: `false` for users with `checks:view_all` (can toggle)
  - Apply permission-based filtering:
    - If user has `checks:view_all`: Show all checks (unless `assignee=me` is true)
    - If user has only `checks:view_own`: Always filter to their clients (ignore `assignee=me` param)
  - Return appropriate checks based on tab logic
  - For completed tab: Group by client, limit to 2-3 most recent per client

#### UI Components
- Replace status filter dropdown with tab navigation
- Add "My Clients" toggle button:
  - Only visible for users with `checks:view_all` permission
  - Default: OFF for ADMIN/IT_MANAGER
  - Hidden for IT_ENGINEER/CONSULTANT (always filtered)
- Implement client grouping for Completed tab
- Implement date grouping for Upcoming tab
- Add expandable sections for client history in Completed tab
- Show appropriate tabs based on permissions (hide "All" tab for users without `checks:view_all`)

#### Performance Considerations
- Efficient queries with proper database indexes
- Pagination for large result sets (especially "All" tab)
- Lazy loading for completed check history expansion

### Considerations
- **Scaling:** With 200+ checks, grouping prevents overwhelming lists
- **Default behavior:** "My Clients" + "Active" tab = focused, actionable view
- **Completed checks:** Minimal display (2-3 per client) keeps clutter low
- **Flexibility:** Users can toggle "My Clients" off or switch to "All" tab if needed
- **Mobile experience:** Tabs should work well on mobile, consider horizontal scroll if needed

### Related Files
- `src/app/api/checks/route.ts` - Checks API endpoint
- `src/components/checks/checks-list-wrapper.tsx` - Checks list UI
- `src/app/(dashboard)/checks/page.tsx` - Checks page
- `src/app/api/clients/route.ts` - Reference implementation for `assignee=me` logic

---

## 3. Text Formatting for Notes/Findings

**Status:** 📋 Planned  
**Priority:** Medium  
**Complexity:** Medium

### Description
Add rich text formatting capabilities to notes and findings fields in infrastructure checks. This would improve readability for multi-line notes and make findings more professional and organized.

### Current State
- Notes are stored as plain `String?` in:
  - `InfraCheck.notes`
  - `CategoryResult.notes`
  - `ItemResult.notes`
- Currently displayed as plain text in textareas
- No formatting support (no line breaks, bold, lists, etc.)

### Implementation Options

#### Option A: Markdown Support
- **Editor:** Use markdown editor (e.g., `react-markdown-editor-lite`, `MDXEditor`)
- **Storage:** Store markdown text in database
- **Display:** Render with `react-markdown` library
- **Pros:** Lightweight, familiar to developers, good for multi-line text, version control friendly
- **Cons:** Learning curve for non-technical users, requires markdown knowledge

#### Option B: Rich Text Editor (WYSIWYG)
- **Editor:** Use Tiptap, Quill, or similar rich text editor
- **Storage:** Store HTML or JSON format
- **Display:** Render HTML directly
- **Pros:** WYSIWYG experience, familiar to most users, no learning curve
- **Cons:** Heavier bundle size, more storage space, requires HTML sanitization for security

#### Option C: Simple Formatting
- **Editor:** Enhanced textarea with toolbar for basic formatting
- **Storage:** Store formatted text (markdown-like syntax)
- **Display:** Parse and render basic formatting
- **Pros:** Simple implementation, fast, lightweight
- **Cons:** Limited features, may not meet all needs

### Recommended Approach
**Option A (Markdown)** - Best balance of features, performance, and maintainability.

### Implementation Details
- **Database:** No schema changes needed (still `String?`)
- **UI Components:**
  - Replace textareas with markdown editor component
  - Add toolbar for common formatting (bold, italic, lists, links)
  - Show preview mode toggle
- **Rendering:**
  - Use `react-markdown` for display
  - Support syntax highlighting for code blocks
  - Custom styling to match app theme

### Slack Integration Limitations

**Critical Consideration:** Notes/findings are sent to Slack, which has limited formatting support. Any rich text formatting must be converted to Slack's `mrkdwn` format.

#### What Slack Supports (mrkdwn):
- **Bold:** `*text*`
- **Italic:** `_text_`
- **Code:** `` `code` ``
- **Strikethrough:** `~text~`
- **Links:** `<https://example.com|Link Text>`
- **Lists:** `•` or `-` for bullets, `1.` for numbered
- **Quotes:** `> quote text`
- **Line breaks:** `\n`

#### What Slack Does NOT Support:
- ❌ Text colors (red, blue, etc.)
- ❌ Background colors
- ❌ Font sizes or families
- ❌ Tables (would need to be converted to plain text)
- ❌ Complex nested lists
- ❌ Images (unless uploaded separately)
- ❌ Text alignment
- ❌ Underline
- ❌ Highlighting

#### Recommended Implementation Strategy:

1. **Use Markdown Editor** (Option A) - Best for Slack compatibility
   - Markdown translates directly to Slack's mrkdwn format
   - Simple conversion: `**bold**` → `*bold*`, `_italic_` → `_italic_`
   - Most formatting will translate seamlessly

2. **Conversion Layer Required:**
   ```typescript
   function markdownToSlack(markdown: string): string {
     // Convert Markdown to Slack mrkdwn
     // Handle edge cases:
     // - Tables → plain text or remove
     // - Complex formatting → simplify
     // - Images → remove or convert to links
   }
   ```

3. **User Experience:**
   - Show Slack preview before sending
   - Warn users about unsupported features (e.g., "Tables won't appear in Slack")
   - Auto-convert Markdown → Slack mrkdwn when posting to Slack
   - Display rich formatting in app, simplified formatting in Slack

4. **What Gets Lost in Slack:**
   - If using rich text editor: Colors, font sizes, tables, alignment, custom styling
   - If using Markdown: Tables (would need special handling), complex nested structures

#### Alternative: WYSIWYG Editor (Option B)
- **Pros:** Better UX for non-technical users
- **Cons:** More complex conversion (HTML → Slack mrkdwn), more formatting loss
- **Conversion challenges:**
  - `<span style="color: red;">Text</span>` → `Text` (color lost)
  - `<table>...</table>` → Plain text or removed
  - Custom styling → Removed

### Considerations
- **Which fields:** All notes fields or specific ones (e.g., only `InfraCheck.notes`)?
- **Backward compatibility:** Existing plain text notes should still display correctly
- **Mobile experience:** Ensure editor works well on mobile devices
- **Export/Print:** Formatting should be preserved in exports and reports
- **Character limits:** Any limits needed for formatted text?
- **Slack compatibility:** Must convert rich text to Slack's limited mrkdwn format
- **User education:** Users should understand what formatting will/won't appear in Slack

### Related Files
- `src/components/checks/check-execution.tsx` - Check execution UI with notes fields
- `prisma/schema.prisma` - Notes field definitions
- `src/app/(dashboard)/checks/[id]/page.tsx` - Check detail page
- `src/app/api/slack/post/route.ts` - Slack message posting (uses `mrkdwn: true`)
- `src/lib/slack-notifications.ts` - Slack notification utilities

---

## 4. Ability to Add Files to Checks

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** High

### Description
Allow users to attach files (e.g., CSV exports, screenshots, device lists) to infrastructure checks. This would enable better documentation and evidence collection during check execution.

### Current State
- No file storage system in place
- No file associations in database schema
- No file upload functionality

### Implementation Approach

#### Storage Options
1. **Vercel Blob** (Recommended if on Vercel)
   - Native integration with Vercel
   - Easy to set up
   - Automatic CDN
   - Pay-per-use pricing

2. **AWS S3 / Cloudflare R2**
   - Industry standard
   - More control
   - Requires AWS/Cloudflare account setup
   - More complex configuration

3. **Database Storage** (Not Recommended)
   - Only for very small files
   - Performance issues with large files
   - Database bloat

4. **Local Filesystem** (Development Only)
   - Simple for dev
   - Not suitable for production

#### Database Schema Changes
```prisma
model CheckFile {
  id          String   @id @default(cuid())
  checkId     String
  fileName    String
  fileUrl     String   // URL to stored file
  fileSize    Int      // in bytes
  mimeType    String?
  uploadedById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  InfraCheck  InfraCheck @relation("CheckFiles", fields: [checkId], references: [id], onDelete: Cascade)
  User        User       @relation("UploadedFiles", fields: [uploadedById], references: [id])
  
  @@index([checkId])
  @@index([uploadedById])
}
```

#### UI Implementation
- **Upload Component:**
  - Drag-and-drop file upload area
  - File picker button
  - Progress indicators for uploads
  - File type validation

- **File Management:**
  - List of attached files in check view
  - Download functionality
  - Delete functionality (with permissions)
  - File preview for images/PDFs
  - File size and type display

- **Display:**
  - Show files in check detail view
  - Include in check reports/exports
  - Show file count badge

### Implementation Details
- **File Size Limits:**
  - Per file: 10MB (configurable)
  - Total per check: 50MB (configurable)
  - Clear error messages when limits exceeded

- **Allowed File Types:**
  - CSV files (`.csv`)
  - Images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`)
  - PDFs (`.pdf`)
  - Documents (`.doc`, `.docx`, `.txt`)
  - Configurable allowlist

- **Security:**
  - File type validation (both extension and MIME type)
  - Virus scanning (optional, via service like ClamAV)
  - Access control (only check participants can view/download)
  - Secure file URLs (signed URLs with expiration)

- **Storage Management:**
  - Automatic cleanup when check is deleted
  - Orphaned file cleanup job (for failed uploads)
  - Storage usage tracking

### Considerations
- **Storage Costs:** Monitor and budget for file storage
- **Performance:** Large files may slow down check loading
- **Backup:** Include files in backup strategy
- **Compliance:** Ensure file storage meets any compliance requirements
- **Where to show:** Check detail view, reports, exports?
- **Permissions:** Who can upload? Who can delete? (Engineer+ only?)
- **File Organization:** Group by category? Tags? Folders?

### Related Files
- `src/components/checks/check-execution.tsx` - Check execution UI
- `src/app/api/checks/[id]/route.ts` - Check API endpoints
- `prisma/schema.prisma` - Schema definitions
- New: `src/app/api/checks/[id]/files/route.ts` - File upload/download endpoints
- New: `src/components/checks/file-upload.tsx` - File upload component

---

## Implementation Priority

Based on complexity and value:

1. ✅ **Checks Page Redesign** - ⭐ Medium complexity, High value - **COMPLETED**
2. **Compliance Management** - ⭐ Medium-High complexity, High value - **See COMPLIANCE_FEATURES.md**
3. **Text Formatting** - ⭐ Medium complexity, Medium value  
4. **Slack Message Override** - ⭐ Medium complexity, Medium value
5. **File Attachments** - ⭐ High complexity, High value

---

## Completed Features

### Checks Page Redesign (Feature #2) - ✅ Completed
- ✅ Tab-based navigation (Active, Upcoming, Completed, All)
- ✅ "My Clients" filter with permission-based visibility
- ✅ Dynamic stats that update with filter
- ✅ Date-based grouping for Upcoming tab
- ✅ Client-based grouping for Completed tab
- ✅ Permission-aware UI (toggle visibility based on role)

**Additional Implementation:**
- ✅ Dynamic stats cards that update when "My Clients" filter is toggled
- ✅ Stats API endpoints (`/api/checks/stats`, `/api/clients/stats`)
- ✅ Client-side stats components with loading states

---

## Notes

- All features should maintain backward compatibility with existing data
- Consider mobile responsiveness for all UI changes
- Ensure proper permissions and access control
- Add appropriate error handling and user feedback
- Consider performance implications, especially for file uploads
- Document API changes and update API documentation
- **Slack Integration:** Any rich text formatting must be compatible with Slack's limited mrkdwn format

---

**Last Updated:** December 2024

