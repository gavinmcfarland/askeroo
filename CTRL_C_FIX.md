# Ctrl+C Always Works - Fix Applied

## Problem Summary

Previously, there were two issues:

1. Ctrl+C wouldn't trigger onCancel callbacks
2. With `exitOnCtrlC: false` set, if the flow failed to start, Ctrl+C wouldn't work at all (process hung)

## Solution Applied

**Moved SIGINT handler registration to runtime constructor** instead of inside `executeFlow()`. This ensures:

-   ✅ Ctrl+C **always** works, even if the flow never starts
-   ✅ onCancel callbacks are executed when user presses Ctrl+C
-   ✅ Process exits gracefully

## Changes Made

### `src/core/prompt-runtime.ts`

**In constructor:**

```typescript
constructor(ui: UI) {
    // ... initialization code ...

    // Set up SIGINT handler immediately so Ctrl+C always works
    this.setupCancelHandler();
}
```

**Removed from executeFlow:**

```typescript
// No longer calling setupCancelHandler() here
// It's now set up in the constructor
```

### How It Works

1. **Runtime created** → SIGINT handler registered immediately
2. **User presses Ctrl+C** → SIGINT signal caught
3. **Handler executes** → All onCancel callbacks run
4. **UI cleanup** → Ink components unmounted
5. **Process exits** → `process.exit(0)`

## Testing

### Test 1: Ctrl+C works immediately (no flow)

```bash
node tests/test-ctrlc-always-works.js
```

**Result:** ✅ Ctrl+C exits process even before any flow starts

### Test 2: onCancel callbacks execute

```bash
node tests/test-oncancel-programmatic.js
```

**Result:** ✅ User callbacks are called on cancellation

### Test 3: Interactive test (requires real terminal)

```bash
node test-ctrlc-interactive.js
```

**Try:** Press Ctrl+C at any time during the prompts
**Result:** You'll see the cleanup message and graceful exit

## Why the "Raw mode not supported" Error Doesn't Matter

When you see:

```
ERROR Raw mode is not supported on the current process.stdin
```

This means Ink can't start its interactive UI, but **Ctrl+C still works** because:

-   The SIGINT handler is registered in the constructor (before Ink starts)
-   Even if Ink fails to initialize, the handler is active
-   Pressing Ctrl+C will still exit the process gracefully

## Usage in Your Code

```typescript
import { ask, text, confirm } from "askeroo";

await ask(async ({ text, confirm, onCancel }) => {
    // Register cleanup callbacks
    onCancel(() => {
        console.log("Cleaning up resources...");
        // Close database connections
        // Remove temporary files
        // Cancel pending operations
    });

    // Multiple callbacks are supported
    onCancel(() => {
        console.log("Saving partial progress...");
    });

    const name = await text({ label: "Name?" });
    const email = await text({ label: "Email?" });

    return { name, email };
});
```

## Important Notes

1. **Ctrl+C always works** - Even if:
    - No flow is running
    - No prompts have been shown
    - Ink fails to initialize
2. **Callbacks execute in order** - Multiple onCancel callbacks run in registration order

3. **Errors are caught** - If a callback throws, it's logged but doesn't prevent other callbacks

4. **Process always exits** - After callbacks run, process.exit(0) is called

## Summary

✅ **Problem Solved:** Ctrl+C now works reliably in all scenarios
✅ **onCancel works:** Callbacks execute before exit
✅ **No hanging:** Process always exits gracefully
✅ **Early registration:** Handler active from runtime creation
