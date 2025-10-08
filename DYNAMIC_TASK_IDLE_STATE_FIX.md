# Dynamic Task Idle State Fix - SUPERSEDED

> **⚠️ NOTE:** This document describes an interim fix that has been superseded by a better implementation.  
> **See:** `PLUGIN_STATE_CONTEXT_IMPLEMENTATION.md` for the current implementation.

## Original Problem

When dynamic tasks were added during task execution, the idle state (□) was inconsistently visible due to race conditions with the polling mechanism.

## Original Fix (Polling-Based)

The initial fix decoupled task registration from execution:

-   Tasks registered with "idle" status
-   Polling mechanism detected tasks
-   After detection, triggered execution
-   This ensured idle state was visible for at least one poll cycle

**Issues with this approach:**

-   Still relied on polling (0-100ms latency)
-   CPU overhead from constant polling
-   Complex polling logic with exponential backoff

## Current Implementation (Context-Based)

**Replaced polling with React Context for instant, reactive updates.**

### How It Works Now

1. **PluginStateContext** provides reactive state management
2. Tasks trigger `notifyChange()` when state updates
3. TasksDisplay subscribes with `usePluginState()` hook
4. React handles updates instantly with `flushSync()`

### Benefits

-   ⚡ **0ms latency** (was 0-100ms)
-   💪 **Zero polling overhead** (was constant CPU usage)
-   🧹 **80 fewer lines** of polling code
-   🔌 **Universal** - any plugin can use it

### Idle State Guarantee

With the context-based system:

1. Task added → Context notified → Instant re-render
2. Idle state (□) rendered
3. After 400ms delay → Task execution begins
4. Running state (spinner) shown

The idle state is **always** visible because React re-renders immediately when the task is added, before the execution timer starts.

## Files

For details on the current implementation, see:

-   `PLUGIN_STATE_CONTEXT_IMPLEMENTATION.md` - Complete implementation guide
-   `src/core/plugin-state-context.tsx` - Context implementation
-   `src/built-ins/tasks/Tasks.tsx` - Updated to use context (no polling)
-   `src/built-ins/tasks/task-store.ts` - Triggers context updates

## Migration Timeline

1. ✅ Initial fix: Polling-based with pending executors (this document)
2. ✅ Investigation: Explored alternatives to polling
3. ✅ Final implementation: React Context system (current)

## Historical Reference

The polling-based fix worked by:

-   Registering task executors but not starting them
-   Polling mechanism detected pending tasks
-   Started tasks after idle state was rendered
-   400ms delay ensured visibility

This approach solved the race condition but introduced other issues (polling overhead, latency). The context-based approach eliminates those issues entirely.
