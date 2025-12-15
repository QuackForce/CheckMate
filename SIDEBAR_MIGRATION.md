# Sidebar Migration Guide

This document explains how to toggle between the old and new sidebar implementations.

## Current Status

We've implemented the new shadcn/ui Sidebar component alongside the existing sidebar. Both are available and can be toggled easily.

## Files

- **Old Sidebar**: `src/components/layout/sidebar.tsx` (backed up as `sidebar-old.tsx`)
- **New Sidebar**: `src/components/layout/app-sidebar.tsx`
- **Old Wrapper**: `src/components/layout/mobile-sidebar-wrapper.tsx`
- **New Wrapper**: `src/components/layout/mobile-sidebar-wrapper-new.tsx`
- **Layout**: `src/app/(dashboard)/layout.tsx` (contains the toggle logic)

## How to Toggle

### Enable New Sidebar

Add to `.env.local`:
```
USE_NEW_SIDEBAR=true
```

### Revert to Old Sidebar

Remove `USE_NEW_SIDEBAR` from `.env.local` or set it to `false`:
```
USE_NEW_SIDEBAR=false
```

Then restart your dev server.

## Features of New Sidebar

- ✅ Collapsible (icon mode)
- ✅ Mobile responsive
- ✅ Keyboard shortcut (Cmd/Ctrl + B)
- ✅ Persistent state (via cookies)
- ✅ Better animations
- ✅ Tooltips when collapsed
- ✅ Inset variant for modern look

## Reverting

If you need to revert completely:

1. Remove `USE_NEW_SIDEBAR` from `.env.local`
2. Restart the dev server
3. The old sidebar will be used automatically

All old sidebar code is preserved in:
- `src/components/layout/sidebar.tsx` (current, used when `USE_NEW_SIDEBAR` is false)
- `src/components/layout/sidebar-old.tsx` (backup)

## Testing

1. Test with `USE_NEW_SIDEBAR=true` - verify new sidebar works
2. Test with `USE_NEW_SIDEBAR=false` - verify old sidebar still works
3. Test mobile responsiveness
4. Test keyboard shortcuts
5. Test navigation and permissions

