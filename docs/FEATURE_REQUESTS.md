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
- **When to allow editing:** Before first send only? After send (override)? Both?
- **Scope:** Apply to all Slack notifications or only main check completion message?
- **Templates:** Should we provide pre-built templates or just free-form text?
- **Placeholders:** Which variables should be available for substitution?

### Related Files
- `src/app/api/slack/post/route.ts` - Slack message posting
- `src/lib/slack-notifications.ts` - Notification functions
- `src/components/checks/check-execution.tsx` - Check execution UI
- `prisma/schema.prisma` - InfraCheck model

---

## 2. "My Clients" Option on Infra Check Page

**Status:** 📋 Planned  
**Priority:** High  
**Complexity:** Low

### Description
Add a "My Clients" filter option to the Infra Checks page, similar to what exists on the Clients page. This would allow users to quickly see only checks for clients they're assigned to.

### Current State
- Checks page (`/checks`) has status and search filters
- Clients page already has `assignee=me` filtering functionality
- Checks are currently filtered by `assignedEngineerId` but not by client assignments
- Client assignments are tracked in `ClientEngineerAssignment` table with roles (SE, PRIMARY, SECONDARY, GRCE, IT_MANAGER)

### Implementation Approach
- **UI Changes:**
  - Add "My Clients" filter toggle/button on checks page
  - Place it alongside existing status and search filters

- **Filter Logic:**
  - Show checks where:
    - User is the assigned engineer (`assignedEngineerId = userId`), OR
    - Check's client has user in `ClientEngineerAssignment` (any role)
  - Similar to clients page `assignee=me` logic

- **API Changes:**
  - Update `/api/checks` GET endpoint to accept `assignee=me` query parameter
  - Apply filter logic similar to `/api/clients?assignee=me`

### Considerations
- **UI Pattern:** Toggle button? Separate filter dropdown? Checkbox?
- **Combination:** Should it work with existing status/search filters?
- **Performance:** Ensure query is efficient with proper database indexes
- **Consistency:** Match the UX pattern from the clients page for familiarity

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

### Considerations
- **Which fields:** All notes fields or specific ones (e.g., only `InfraCheck.notes`)?
- **Backward compatibility:** Existing plain text notes should still display correctly
- **Mobile experience:** Ensure editor works well on mobile devices
- **Export/Print:** Formatting should be preserved in exports and reports
- **Character limits:** Any limits needed for formatted text?

### Related Files
- `src/components/checks/check-execution.tsx` - Check execution UI with notes fields
- `prisma/schema.prisma` - Notes field definitions
- `src/app/(dashboard)/checks/[id]/page.tsx` - Check detail page

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

1. **"My Clients" Filter** - ⭐ Low complexity, High value
2. **Text Formatting** - ⭐ Medium complexity, Medium value  
3. **Slack Message Override** - ⭐ Medium complexity, Medium value
4. **File Attachments** - ⭐ High complexity, High value

---

## Notes

- All features should maintain backward compatibility with existing data
- Consider mobile responsiveness for all UI changes
- Ensure proper permissions and access control
- Add appropriate error handling and user feedback
- Consider performance implications, especially for file uploads
- Document API changes and update API documentation

---

**Last Updated:** December 2024

