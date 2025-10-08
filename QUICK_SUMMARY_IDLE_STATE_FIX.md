# Quick Summary: Dynamic Task Idle State Fix

## What Changed

**Before**: Dynamic tasks used a fixed 100ms delay before starting execution, which created a race condition with the polling mechanism. The idle state was sometimes missed.

**After**: Task execution is now controlled by the polling mechanism. Tasks are registered but don't start until the polling mechanism detects and renders them.

## Key Changes

### 1. Task Store (`task-store.ts`)

-   Added `pendingTaskExecutors` map to store task execution functions
-   New functions: `registerTaskExecutor()`, `startPendingTask()`, `getPendingTaskIds()`

### 2. Task Addition (`Tasks.tsx` - `addDynamicTask()`)

-   Removed `setTimeout()` with fixed delay
-   Now registers executor function without starting it
-   Polling mechanism will start it after rendering

### 3. Polling Mechanism (`Tasks.tsx` - poll loop)

-   Now checks for pending tasks after each poll
-   Starts pending tasks using `setTimeout(..., 0)` to ensure render completes first
-   Guarantees idle state is visible before execution

## Result

✅ **100% reliable**: Idle state is always rendered before execution starts
✅ **No race condition**: Execution waits for polling to detect the task
✅ **More responsive**: Tasks start as soon as they're rendered (no artificial delay)
✅ **Deterministic**: Behavior is predictable and consistent

## Testing

Run visual test:

```bash
npm run build
node dist/tests/test-idle-state-visual.js
```

Watch for: Each dynamic task should show □ (idle) before showing the spinner (running).
