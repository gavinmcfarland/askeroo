# Dynamic Task Idle State Fix

## Problem

When dynamic tasks were added during task execution, the idle state (□) was inconsistently visible. Sometimes it would appear, other times the task would immediately show in the running state (spinner), making it unclear whether the task had started.

## Root Cause

The issue was a **race condition** between task execution timing and the UI polling mechanism:

1. **Task execution**: When a dynamic task is added via `tasks.add()`:

    - Task added to store with `"idle"` status
    - Immediately started execution with a fixed delay (originally 100ms)
    - Transitioned to `"running"` status after the delay

2. **UI polling mechanism**: The TasksDisplay component polls the global task store for updates:
    - Poll interval: **~100ms** (with exponential backoff)
    - First poll after task addition: **0-100ms** (depending on timing)

### The Race Condition

```
Timeline (BEFORE FIX):
T+0ms:      Dynamic task added with status="idle"
T+0-100ms:  Next UI poll occurs (may or may not see idle state)
T+100ms:    Task transitions to status="running"
T+100-200ms: UI poll definitely sees "running" state

Result: If the poll happens after T+100ms, the idle state is never rendered!
```

### Why This Happened

The problem was that **task execution started on a fixed timer**, independent of whether the UI had detected and rendered the task. The polling mechanism couldn't guarantee it would catch the idle state before the timer expired.

## Solution

**Decouple task registration from task execution** by making the polling mechanism control when tasks start:

1. When a task is added, register its executor function but **don't start it**
2. The polling mechanism detects new idle tasks
3. After the task is rendered (idle state shown), the polling mechanism **triggers execution**

This eliminates the race condition because execution only starts **after** the polling mechanism has picked up the task.

```typescript
// In addDynamicTask() - register executor but don't start it
const executor = async () => {
    updateTaskStateInStore(taskListId, taskId, { status: "running" });
    if (task.action) await task.action();
    updateTaskStateInStore(taskListId, taskId, { status: "success" });
};

// Register for later execution by polling mechanism
registerTaskExecutor(taskId, executor);

// In polling mechanism - start pending tasks after they're detected
const pendingTaskIds = getPendingTaskIds(taskListId);
if (pendingTaskIds.length > 0) {
    setTimeout(() => {
        pendingTaskIds.forEach((taskId) => startPendingTask(taskId));
    }, 0);
}
```

### How This Works

```
Timeline (AFTER FIX):
T+0ms:     Dynamic task added with status="idle", executor registered
T+0-100ms: First poll detects new idle task
T+0-100ms: Poll schedules executor to start (after current render)
T+0-100ms: Render completes, idle state is visible ✓
T+0-100ms: Executor starts, task transitions to "running"

Result: Idle state is ALWAYS rendered before execution begins!
```

The key insight: Instead of using a fixed delay and hoping the polling catches it, **wait for the polling to detect the task, then start execution**.

## Changes Made

### File: `src/built-ins/tasks/task-store.ts`

1. **Added pending task executor storage**:

    ```typescript
    let pendingTaskExecutors: Map<string, () => Promise<void>> = new Map();
    ```

2. **New functions**:
    - `registerTaskExecutor()` - Register a task's executor for later execution
    - `startPendingTask()` - Start a previously registered task
    - `isTaskPending()` - Check if a task is pending execution
    - `getPendingTaskIds()` - Get all pending task IDs for a task list

### File: `src/built-ins/tasks/Tasks.tsx`

1. **Updated `addDynamicTask()`**:

    - Removed fixed `setTimeout()` delay
    - Created executor function but don't call it
    - Register executor using `registerTaskExecutor()`

2. **Updated polling mechanism**:
    - After detecting state changes, check for pending tasks
    - Start pending tasks using `setTimeout(..., 0)` to ensure current render completes first
    - This guarantees idle state is visible before execution begins

## Testing

Test file: `tests/test-dynamic-task-idle-state.ts`

This test adds multiple dynamic tasks in quick succession. With the fix:

-   Each task reliably shows the idle state (□) before transitioning to running (spinner)
-   No race condition - idle state is always visible
-   Execution starts only after the task is rendered

To run:

```bash
npm run build
node dist/tests/test-dynamic-task-idle-state.js
```

## Comparison with Regular Tasks

Regular tasks (added at initialization) use a **400ms** delay before execution:

```typescript
// In TasksDisplay component initialization:
setTimeout(() => {
    executeAllTasks();
}, 400);
```

This is different because:

-   Regular tasks are initialized all at once when component mounts
-   The 400ms delay gives users time to read the full task list
-   No polling is involved - tasks are in component state from the start

Dynamic tasks now use the same principle but coordinated with polling:

-   Wait for UI to detect and render the idle state
-   Then start execution immediately after render completes
-   More responsive than a fixed delay, and 100% reliable

## Advantages of This Approach

1. **No race condition**: Execution starts only after task is rendered
2. **No arbitrary delays**: Task starts as soon as it's safely rendered
3. **More responsive**: Tasks start faster than with a long fixed delay
4. **Deterministic**: Behavior is predictable and testable
5. **Minimal changes**: Works within existing polling architecture

## Future Improvements

While this fix is robust, the ideal solution would eliminate polling entirely:

1. **Reactive state management**: Pass dynamic tasks as props from PromptApp
2. **Event-driven updates**: Use an event emitter pattern for task state changes
3. **Context-based state**: Use React Context to share task state reactively

However, those would require significant architectural changes. The current fix is minimal, effective, and maintains backward compatibility while solving the core issue.
