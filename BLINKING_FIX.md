# CLI Blinking Issue - Root Cause and Fix

## Issue Description

When the user navigated back (pressed Escape) in the CLI, the entire terminal would blink/flash. This issue was introduced in commit `641624a71ed556812a207aadf6728dc79b3f8b80`.

## Root Cause

The commit introduced a "rendering suppression" mechanism that returned `null` from the `PromptApp` component during state transitions. The intent was to prevent intermediate renders that could cause duplication issues.

However, this approach was too aggressive:

1. When `suppressRendering` was set to `true`, the component returned `null`
2. Returning `null` caused Ink to completely **unmount** the entire UI, clearing the terminal
3. When `suppressRendering` was set back to `false`, the component re-rendered
4. Ink would then **remount** the entire UI from scratch
5. This unmount/remount cycle created a visible **blink/flash** effect

### Code that caused the issue:

```typescript
// In PromptApp.tsx
if (internalRefs.current.suppressRendering) {
    return null; // ❌ This cleared the terminal!
}
```

## The Fix

The fix removes the `suppressRendering` logic entirely. The existing combination of:

1. **`renderKey` state** - Forces a complete remount of the component tree
2. **`applyInkRenderingFix()`** - Provides micro-delays for React reconciliation
3. **`flushSync()`** - Ensures synchronous state updates

...is sufficient to prevent duplication issues **without** causing visual artifacts.

### Changes Made

1. **Removed `suppressRendering` flag** from `internalRefs`
2. **Simplified `performTreeBackNavigation()`** - Removed all suppression logic
3. **Simplified `clear-group-back` case** - Removed suppression and extra render triggers
4. **Removed the null check** in the render section
5. **Updated documentation** - Marked the suppression approach as removed due to blinking

## Testing

To verify the fix:

1. Run any example (e.g., `npm run example plugma`)
2. Navigate forward through multiple prompts
3. Press Escape to navigate back
4. Verify that:
    - ✅ No blinking/flashing occurs
    - ✅ No duplication of prompts
    - ✅ Smooth transition back to previous prompt

## Files Modified

-   `src/components/PromptApp.tsx` - Removed suppressRendering logic
-   `RENDERING_FIX_NOTES.md` - Updated to document why suppression was removed
-   `BLINKING_FIX.md` - This file (summary of the fix)

## Lesson Learned

When working with Ink-based terminal UIs, returning `null` from the root component causes complete unmounting and creates visual artifacts. Instead, use a combination of:

-   State keys to force remounts
-   Synchronous state updates with `flushSync()`
-   Micro-delays to allow React reconciliation

This provides smooth transitions without visual disruption.
