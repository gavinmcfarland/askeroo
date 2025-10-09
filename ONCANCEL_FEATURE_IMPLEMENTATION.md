# onCancel Event Listener Implementation

## Overview

Added `onCancel` event listener functionality to the `ask()` flow function, allowing developers to register cleanup callbacks that are executed when users cancel the flow (e.g., via Ctrl+C).

## Implementation Details

### Core Changes

1. **PromptRuntime** (`src/core/prompt-runtime.ts`)

    - Added `cancelCallbacks` array to store registered callbacks
    - Added `sigintHandler` to track the SIGINT listener
    - Modified `executeFlow` to provide `onCancel` function in the API
    - Added `setupCancelHandler()` method to register SIGINT listener
    - Added `cleanupCancelHandler()` method to clean up listeners and callbacks
    - Wrapped flow execution in try-finally to ensure cleanup

2. **UI Layer** (`src/core/ui.tsx`)

    - Added `exitOnCtrlC: false` option to Ink's render function to prevent immediate exit on Ctrl+C
    - This allows our custom SIGINT handler to execute before the process terminates

3. **Type Definitions** (`src/types/index.ts`)

    - Updated `FlowFunction<T>` type to include `onCancel` parameter
    - Signature: `onCancel: (callback: () => void) => void`

### Features

-   **Multiple Callbacks**: Supports registering multiple cancel callbacks
-   **Error Handling**: Catches and logs errors in individual callbacks without breaking execution
-   **Automatic Cleanup**: SIGINT handler is automatically cleaned up when flow completes
-   **Debug Logging**: Logs cancellation events with callback counts

### API Usage

```typescript
import { ask, text, confirm } from "askeroo";

await ask(async ({ text, confirm, onCancel }) => {
    // Register cleanup callback
    onCancel(() => {
        console.log("Flow cancelled! Cleaning up...");
        // Close connections, remove temp files, etc.
    });

    const name = await text({ label: "Name" });
    const confirmed = await confirm({ label: "Confirm?" });
    return { name, confirmed };
});
```

### Multiple Callbacks Example

```typescript
await ask(async ({ onCancel }) => {
    // Create resources
    const tempFile = "temp.json";
    fs.writeFileSync(tempFile, "{}");

    // Register multiple cleanup callbacks
    onCancel(() => {
        console.log("Removing temp file...");
        fs.unlinkSync(tempFile);
    });

    onCancel(() => {
        console.log("Closing database connection...");
        db.close();
    });

    // ... rest of flow
});
```

## Implementation Approach

The implementation uses Node.js's `process.on('SIGINT')` to handle Ctrl+C signals, combined with Ink's `exitOnCtrlC: false` option. The flow is:

1. **UI Layer** sets `exitOnCtrlC: false` when rendering the Ink app, preventing immediate exit
2. **Runtime** registers a SIGINT handler via `process.on('SIGINT')` when the flow starts
3. When user presses **Ctrl+C**, Node.js emits the SIGINT signal
4. Our handler catches it, runs all user-provided cancel callbacks, cleans up the UI, and exits

**Why This Approach:**

-   Ctrl+C generates a **SIGINT signal**, not keyboard input, so `useInput` cannot catch it
-   Setting `exitOnCtrlC: false` prevents Ink from exiting immediately, giving our handler time to run
-   Using `process.on('SIGINT')` is the standard Node.js way to handle process signals
-   The handler is properly cleaned up in the `finally` block to prevent memory leaks

## Files Modified

1. `src/core/prompt-runtime.ts` - Core runtime with SIGINT handler implementation
2. `src/core/ui.tsx` - Added `exitOnCtrlC: false` to render options
3. `src/types/index.ts` - Type definitions
4. `README.md` - Documentation updates

## Files Created

1. `examples/oncancel-example.ts` - Basic usage example
2. `examples/oncancel-advanced.ts` - Advanced usage with multiple callbacks and resource cleanup
3. `tests/test-oncancel-api.js` - API verification test

## Testing

All tests pass successfully:

-   ✅ onCancel is available as a function parameter
-   ✅ Callbacks can be registered successfully
-   ✅ Multiple callbacks can be registered
-   ✅ Flow completes successfully with the new API

## Behavior

When the user presses Ctrl+C during a flow:

1. The SIGINT handler is triggered
2. All registered cancel callbacks are executed in order
3. If any callback throws an error, it's caught and logged, but doesn't stop other callbacks
4. UI is cleaned up
5. Process exits with code 0

## Backward Compatibility

This change is fully backward compatible. The `onCancel` parameter is optional and doesn't affect existing flows that don't use it.
