# Spinner hideOnCompletion Fix

## Issue

Spinners with `hideOnCompletion: true` were not hiding after completion when used inside `onCancel` handlers.

## Root Cause

The hiding logic in `Spinner.tsx` was checking for `node.state === "completed"` before hiding the spinner. However, when spinners are created during `onCancel` mode:

1. The prompt node is marked with `isCancelPrompt: true`
2. The node may remain in the `active` state even after the spinner is stopped
3. Since `isCompleted = item.completed && !isActive`, the node state never transitions to `"completed"`
4. Therefore, the `hideOnCompletion` logic never triggers

## Solution

Changed the hiding logic to check the spinner's actual status (`spinnerState.status === "stopped"`) rather than relying on the node state. This works correctly in both scenarios:

-   **Normal flows**: Spinner hides when stopped (node eventually becomes completed)
-   **onCancel flows**: Spinner hides when stopped (even if node stays active)

## Changes Made

**File**: `src/built-ins/spinner/Spinner.tsx` (lines 219-232)

### Before:

```typescript
// Don't render if we're completed and should hide
if (options.hideOnCompletion && node.state === "completed") {
    const spinnerFinished = spinnerState.status === "stopped";

    // If spinner finished and either no delay or delay has elapsed
    if (spinnerFinished) {
        // No delay: hide immediately
        if (!options.submitDelay || options.submitDelay === 0) {
            return null;
        }
        // With delay: hide after delay timer completes
        if (shouldHideAfterDelay) {
            return null;
        }
    }
}
```

### After:

```typescript
// Don't render if we're completed and should hide
// Hide when spinner is stopped and hideOnCompletion is true
// This works both in normal flows (when node.state === "completed")
// and in onCancel flows (where node might stay active)
if (options.hideOnCompletion && spinnerState.status === "stopped") {
    // No delay: hide immediately
    if (!options.submitDelay || options.submitDelay === 0) {
        return null;
    }
    // With delay: hide after delay timer completes
    if (shouldHideAfterDelay) {
        return null;
    }
}
```

## Testing

Verified that the fix works correctly for:

1. ✅ Spinners in normal flows with `hideOnCompletion: true` (no delay)
2. ✅ Spinners in normal flows with `hideOnCompletion: true` + `submitDelay`
3. ✅ Spinners without `hideOnCompletion` (remain visible as expected)
4. ✅ Spinners in `onCancel` handlers with `hideOnCompletion: true`

## Example Usage

```typescript
await ask(flow, {
    onCancel: async ({ results, cleanup }) => {
        const cancel = await spinner("Canceling...", {
            style: { color: "yellow" },
            hideOnCompletion: true, // Now works correctly!
        });

        await cancel.start();
        await sleep(800);
        await cancel.stop("Cancelled");
        // Spinner now hides as expected

        process.exit(0);
    },
});
```
