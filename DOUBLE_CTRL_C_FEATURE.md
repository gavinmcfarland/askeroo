# Double Ctrl+C Force Quit Feature

## Overview

Enhanced the cancellation system to support **force quit** on the second Ctrl+C press. This provides a safety mechanism for users who want to immediately exit the application if the graceful cancellation is taking too long or is stuck.

## Behavior

### First Ctrl+C Press

When the user presses Ctrl+C for the first time:

1. **Graceful Cancellation** is initiated
2. All registered `onCancel` callbacks are executed
3. User is informed: `"(Press Ctrl+C again to force quit)"`
4. Process waits for callbacks to complete or for user action
5. Fallback timeout of 60 seconds before auto-exit

### Second Ctrl+C Press

When the user presses Ctrl+C a second time:

1. **Force Quit** is triggered immediately
2. Message displayed: `"Force quitting..."`
3. `process.exit(1)` is called immediately
4. No cleanup or callbacks are executed
5. Process terminates instantly

## Implementation Details

### Changes to `PromptRuntime` (`src/core/prompt-runtime.ts`)

1. **Added Counter Tracking**

    ```typescript
    private ctrlCPressCount: number = 0;
    ```

2. **Enhanced `handleCtrlC()` Method**

    - Increments `ctrlCPressCount` on each press
    - Checks if `ctrlCPressCount >= 2` to trigger force quit
    - First press: Runs onCancel callbacks and shows hint message
    - Second press: Calls `process.exit(1)` immediately

3. **Counter Reset on Cleanup**
    - The counter is reset in `cleanupCancelHandler()` when the flow completes
    - Ensures proper state management for subsequent flows

### Code Flow

```typescript
handleCtrlC(): void {
    this.ctrlCPressCount++;

    if (this.ctrlCPressCount >= 2) {
        // Force quit
        console.log("\nForce quitting...");
        process.exit(1);
        return;
    }

    // First Ctrl+C - graceful cancellation
    console.log("\n(Press Ctrl+C again to force quit)");
    // ... run onCancel callbacks ...
}
```

## User Experience

### Without onCancel Callbacks

If no `onCancel` callbacks are registered:

-   First Ctrl+C: Immediate exit (existing behavior)
-   Second Ctrl+C: Not needed

### With onCancel Callbacks

If `onCancel` callbacks are registered:

**First Ctrl+C:**

```
(Press Ctrl+C again to force quit)
Running cleanup tasks...
  ✓ Closing database connections
  ✓ Saving partial progress
  ✓ Removing temporary files
```

**Second Ctrl+C:**

```
Force quitting...
[Process exits immediately with code 1]
```

## Examples

### Basic Usage

```typescript
import { ask, text } from "askeroo";

await ask(async ({ text, onCancel }) => {
    onCancel(({ results, cleanup }) => {
        console.log("Cleaning up resources...");
        // Perform cleanup operations
        // If this takes too long, user can press Ctrl+C again
    });

    const name = await text({ label: "Name" });
    return { name };
});
```

### Demo Example

See `examples/double-ctrlc-demo.ts` for a comprehensive demonstration that shows:

-   Graceful cancellation on first Ctrl+C
-   Force quit on second Ctrl+C
-   User-friendly messaging and formatting

Run it with:

```bash
npm run example examples/double-ctrlc-demo.ts
```

## Testing

### Interactive Testing

Run the manual test to try the feature yourself:

```bash
node test-double-ctrlc.js
```

Then:

1. Press Ctrl+C once → See onCancel message
2. Press Ctrl+C again → Process exits immediately

### Programmatic Testing

A programmatic test is available at `tests/test-double-ctrlc-programmatic.js` that:

-   Simulates pressing Ctrl+C twice
-   Verifies that `process.exit(1)` is called on the second press
-   Confirms that onCancel callbacks run on the first press

## Design Rationale

### Why Force Quit?

1. **Safety Net**: If cleanup callbacks hang or take too long, users need an escape hatch
2. **User Control**: Gives users explicit control over when to exit
3. **Industry Standard**: Many CLI tools (Docker, npm, etc.) use double Ctrl+C for force quit
4. **Non-Breaking**: Doesn't change the behavior of the first Ctrl+C press

### Exit Codes

-   First Ctrl+C: Graceful exit with code `0` (success)
-   Second Ctrl+C: Force quit with code `1` (error/forced termination)

The different exit codes help scripts and CI/CD pipelines distinguish between:

-   Graceful user cancellation (code 0)
-   Forced termination (code 1)

## Backward Compatibility

✅ **Fully Backward Compatible**

-   Existing flows without `onCancel` work exactly as before
-   Existing flows with `onCancel` get the new force quit capability for free
-   No API changes required
-   No breaking changes to behavior

## Files Modified

1. `src/core/prompt-runtime.ts` - Added counter and force quit logic

## Files Created

1. `test-double-ctrlc.js` - Interactive test
2. `tests/test-double-ctrlc-programmatic.js` - Programmatic test
3. `examples/double-ctrlc-demo.ts` - Comprehensive demo
4. `DOUBLE_CTRL_C_FEATURE.md` - This documentation

## Future Enhancements

Potential improvements for future versions:

1. **Configurable Behavior**: Allow customization of force quit key combination
2. **Timeout Customization**: Let users configure the fallback timeout
3. **Progress Indication**: Show progress of cleanup callbacks
4. **Graceful Force Quit**: Option to run minimal cleanup even on force quit
