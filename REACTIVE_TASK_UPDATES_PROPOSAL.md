# Proposal: Replace Polling with Reactive Task Updates

## Current Architecture (Polling-Based)

### How It Works Now

```
┌─────────────────────────────────────────────────────────────┐
│ Task Added                                                   │
│   ↓                                                          │
│ task-store.ts (global state)                                │
│   ↓                                                          │
│ updateTaskStoreCallback() called (but doesn't trigger render)│
│   ↓                                                          │
│ TasksDisplay polls every ~100ms                             │
│   ↓                                                          │
│ Detects change → setState → Re-render                       │
└─────────────────────────────────────────────────────────────┘
```

### Issues

-   ⏱️ **Latency**: Up to 100ms delay before changes appear
-   🔄 **CPU waste**: Constantly polling even when nothing changes
-   🐛 **Race conditions**: Timing issues between polls (idle state bug)
-   📉 **Complexity**: Exponential backoff, state tracking, manual optimization

### Current Workarounds

-   400ms delay before starting tasks (to ensure idle state visible)
-   Complex pending task executor system
-   Polling with dynamic intervals

## Proposed Architecture (Reactive)

### Option 1: Props from PromptApp (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│ Task Added                                                   │
│   ↓                                                          │
│ task-store.ts (global state)                                │
│   ↓                                                          │
│ updateTaskStoreCallback() → PromptApp.setTaskRevision()     │
│   ↓                                                          │
│ flushSync() → Immediate re-render                           │
│   ↓                                                          │
│ TasksDisplay receives new props → Re-render                 │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// 1. Add state to PromptApp
const [taskRevision, setTaskRevision] = useState(0);

// 2. Initialize task store with callback
useEffect(() => {
    initializeTasksInApp(
        () => flushSync(() => setTaskRevision((prev) => prev + 1)),
        () => flushSync(() => setTaskRevision((prev) => prev + 1)),
        () => flushSync(() => setTaskRevision((prev) => prev + 1))
    );
}, []);

// 3. Pass revision as prop through tree
<RecursiveGroupContainer
    item={currentTree.root}
    taskRevision={taskRevision}
    // ... other props
/>;

// 4. TasksDisplay receives prop and triggers re-render automatically
export const TasksDisplay = ({ node, options, events, taskRevision }) => {
    // No polling needed!
    // Component re-renders when taskRevision changes
    const dynamicTasks = getDynamicTasksForList(taskListId);
    const taskStates = getAllTaskStatesForList(taskListId);
    // ...
};
```

**Advantages:**

-   ✅ **Zero latency**: Instant updates with flushSync
-   ✅ **Zero polling overhead**: React handles updates
-   ✅ **Simpler code**: No polling logic needed
-   ✅ **React patterns**: Uses standard React data flow
-   ✅ **Already implemented**: Hint updates use this exact pattern!

**Reference - Hint Updates (PromptApp.tsx:68-87):**

```typescript
const handleHintChange = useCallback(
    (hint: React.ReactNode) => {
        if (currentPrompt?.id) {
            if (hint !== null) {
                internalRefs.current.hintsByPromptId.set(
                    currentPrompt.id,
                    hint
                );
                // Use flushSync to make hint update synchronous
                flushSync(() => {
                    setTreeRevision((prev) => prev + 1);
                });
            }
        }
    },
    [currentPrompt?.id]
);
```

**Tasks can use the same pattern!**

---

### Option 2: React Context

```typescript
// TasksContext.tsx
const TasksContext = createContext<TasksState>({});

export function TasksProvider({ children }) {
    const [state, setState] = useState({});

    useEffect(() => {
        initializeTaskStore((newState) => {
            flushSync(() => setState(newState));
        });
    }, []);

    return (
        <TasksContext.Provider value={state}>{children}</TasksContext.Provider>
    );
}

// TasksDisplay.tsx
export const TasksDisplay = ({ node, options, events }) => {
    const tasksState = useContext(TasksContext);
    // Automatically re-renders when context changes
};
```

**Advantages:**

-   ✅ Zero polling
-   ✅ Instant updates
-   ✅ Decoupled from PromptApp

**Disadvantages:**

-   ⚠️ Adds complexity (new provider)
-   ⚠️ Not consistent with current architecture
-   ⚠️ Would need to wrap entire app

---

### Option 3: Event Emitter Pattern

```typescript
// task-store.ts
import { EventEmitter } from "events";
const taskEmitter = new EventEmitter();

export function addDynamicTaskToList(taskListId: string, task: any) {
    // ... add task logic
    taskEmitter.emit("taskAdded", { taskListId, taskId });
}

// TasksDisplay.tsx
useEffect(() => {
    const handler = () => {
        setDynamicTasks(getDynamicTasksForList(taskListId));
    };
    taskEmitter.on("taskAdded", handler);
    return () => taskEmitter.off("taskAdded", handler);
}, [taskListId]);
```

**Advantages:**

-   ✅ Zero polling
-   ✅ Event-driven

**Disadvantages:**

-   ⚠️ Requires new dependency or custom implementation
-   ⚠️ Not consistent with existing patterns
-   ⚠️ Still requires component state management

---

## Recommendation: Option 1 (Props from PromptApp)

**Why this is the best choice:**

1. **Already proven**: The hint update system uses this exact pattern successfully
2. **Minimal changes**: Use existing callback infrastructure
3. **Zero latency**: flushSync ensures immediate updates
4. **Consistent**: Follows existing PromptApp patterns
5. **Simple**: No new dependencies or concepts

### Implementation Plan

#### Phase 1: Add Task State to PromptApp

```typescript
// PromptApp.tsx
const [taskRevision, setTaskRevision] = useState(0);

useEffect(() => {
    initializeTasksInApp(
        () => flushSync(() => setTaskRevision((prev) => prev + 1)),
        () => flushSync(() => setTaskRevision((prev) => prev + 1)),
        () => flushSync(() => setTaskRevision((prev) => prev + 1))
    );
}, []);
```

#### Phase 2: Thread Prop Through Components

```typescript
// RecursiveGroupContainer.tsx
export function RecursiveGroupContainer({
    item,
    treeManager,
    onSubmit,
    onBack,
    onHintChange,
    hintText,
    taskRevision, // Add this
    // ...
}) {
    // Pass to PluginWrapper when rendering tasks
    <PluginWrapper
        pluginType={item.fieldType}
        taskRevision={taskRevision}
        // ... other props
    />;
}
```

#### Phase 3: Update TasksDisplay

```typescript
// Tasks.tsx
export const TasksDisplay = ({ node, options, events, taskRevision }) => {
    // Remove all polling logic!
    const [taskStates, setTaskStates] = useState(new Map());
    const [dynamicTasks, setDynamicTasks] = useState([]);

    // Update when taskRevision changes
    useEffect(() => {
        setDynamicTasks(getDynamicTasksForList(taskListId));
        setTaskStates(getAllTaskStatesForList(taskListId));
    }, [taskRevision, taskListId]);

    // No more polling interval!
    // No more exponential backoff!
    // Just reactive updates!
};
```

#### Phase 4: Simplify Idle State Handling

```typescript
// With reactive updates, idle state is guaranteed visible!
// Can even remove the 400ms delay if desired
const executor = async () => {
    // Task starts immediately after being registered
    // React will render idle state before this runs
    updateTaskStateInStore(taskListId, taskId, { status: "running" });
    // ...
};
registerTaskExecutor(taskId, executor);
```

### Benefits of This Approach

**Performance:**

-   ⚡ **0ms latency** vs 0-100ms with polling
-   💪 **No CPU waste** - only updates when needed
-   🎯 **Precise updates** - exactly when state changes

**Code Quality:**

-   🧹 **Remove ~50 lines** of polling logic
-   📉 **Less complexity** - no intervals, no backoff
-   🐛 **Fewer bugs** - no race conditions

**User Experience:**

-   ✨ **Instant updates** - tasks appear immediately
-   🎨 **Smoother animations** - no polling jank
-   👁️ **Reliable idle state** - always visible

## Next Steps

1. ✅ Document current issues (done)
2. ✅ Analyze alternatives (done)
3. ⬜ Implement Phase 1: PromptApp state
4. ⬜ Implement Phase 2: Thread props
5. ⬜ Implement Phase 3: Update TasksDisplay
6. ⬜ Test and verify
7. ⬜ Remove old polling code
8. ⬜ Update documentation

## Questions?

-   **Will this work with multiple task lists?** Yes, taskRevision triggers updates for all lists
-   **What about performance?** Better than polling - only updates when needed
-   **Breaking changes?** No - internal implementation only
-   **Migration path?** Can keep polling as fallback during transition
