# Generic Plugin State Management System

## Problem

Currently, plugins that need to update their state externally (like tasks adding dynamic tasks) must use polling. We need a **generic solution that ANY plugin can use** to trigger reactive updates.

## Requirements

1. ✅ **Universal**: Any plugin can hook into it
2. ✅ **Simple API**: Easy for plugin authors to use
3. ✅ **Performant**: Zero polling overhead
4. ✅ **Non-intrusive**: Minimal changes to existing architecture
5. ✅ **Consistent**: Follows existing patterns in the codebase

## Options Analysis

### ❌ Option 1: Props from PromptApp

**Why it doesn't work:**

```typescript
// Would require adding state for EVERY plugin type
const [taskRevision, setTaskRevision] = useState(0);
const [customPluginRevision, setCustomPluginRevision] = useState(0);
const [anotherPluginRevision, setAnotherPluginRevision] = useState(0);
// ... for every plugin that needs reactive state
```

-   ⚠️ **Not scalable**: PromptApp grows with every plugin
-   ⚠️ **Tight coupling**: PromptApp knows about every plugin
-   ⚠️ **Breaking changes**: New plugins require PromptApp changes

**Verdict: Not suitable for generic use**

---

### ✅ Option 2: React Context (Recommended)

Create a **generic PluginStateContext** that any plugin can subscribe to:

```typescript
// plugin-state-context.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { flushSync } from "react-dom";

interface PluginStateContextValue {
    revision: number;
    notifyChange: () => void;
}

const PluginStateContext = createContext<PluginStateContextValue>({
    revision: 0,
    notifyChange: () => {},
});

export function PluginStateProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [revision, setRevision] = useState(0);

    const notifyChange = () => {
        flushSync(() => {
            setRevision((prev) => prev + 1);
        });
    };

    return (
        <PluginStateContext.Provider value={{ revision, notifyChange }}>
            {children}
        </PluginStateContext.Provider>
    );
}

export function usePluginState() {
    return useContext(PluginStateContext);
}
```

**Usage in ANY plugin:**

```typescript
// tasks/Tasks.tsx
export const TasksDisplay = ({ node, options, events }) => {
    const { revision } = usePluginState(); // Subscribe to updates

    useEffect(() => {
        // Refresh state when revision changes
        setDynamicTasks(getDynamicTasksForList(taskListId));
        setTaskStates(getAllTaskStatesForList(taskListId));
    }, [revision, taskListId]);

    // No polling needed!
};

// tasks/task-store.ts
let notifyPluginStateChange: (() => void) | null = null;

export function initializeTaskStore() {
    // Get notifier from context (set once)
}

export function addDynamicTaskToList(taskListId: string, task: any) {
    // ... add task
    if (notifyPluginStateChange) {
        notifyPluginStateChange(); // Trigger re-render!
    }
}
```

**Integration:**

```typescript
// ui.tsx or PromptApp.tsx
import { PluginStateProvider } from "./plugin-state-context";

<PluginStateProvider>
    <RecursiveGroupContainer {...props} />
</PluginStateProvider>;
```

**Advantages:**

-   ✅ **Universal**: Any plugin can use `usePluginState()`
-   ✅ **Decoupled**: PromptApp doesn't know about specific plugins
-   ✅ **Simple API**: Just call `notifyChange()` from anywhere
-   ✅ **Zero polling**: React handles updates
-   ✅ **Instant updates**: Uses `flushSync()`
-   ✅ **Scalable**: Works for unlimited plugins

**Disadvantages:**

-   ⚠️ **Global updates**: All subscribed plugins re-render (but can optimize)
-   ⚠️ **New concept**: Adds Context to the architecture

---

### ✅ Option 3: Generic Revision Counter in PromptApp

Use a **single generic counter** that any plugin can trigger:

```typescript
// PromptApp.tsx
const [pluginRevision, setPluginRevision] = useState(0);

// Expose global function for ANY plugin to trigger updates
useEffect(() => {
    (globalThis as any).__notifyPluginStateChange = () => {
        flushSync(() => {
            setPluginRevision((prev) => prev + 1);
        });
    };
}, []);

// Pass to all plugins via props
<RecursiveGroupContainer
    item={currentTree.root}
    pluginRevision={pluginRevision}
    {...otherProps}
/>;
```

**Usage in ANY plugin:**

```typescript
// tasks/task-store.ts
export function addDynamicTaskToList(taskListId: string, task: any) {
    // ... add task
    if ((globalThis as any).__notifyPluginStateChange) {
        (globalThis as any).__notifyPluginStateChange();
    }
}

// Tasks.tsx
export const TasksDisplay = ({ node, options, events, pluginRevision }) => {
    useEffect(() => {
        // Refresh when pluginRevision changes
        setDynamicTasks(getDynamicTasksForList(taskListId));
    }, [pluginRevision, taskListId]);
};

// ANY other plugin can do the same!
export const CustomPlugin = ({ node, options, events, pluginRevision }) => {
    useEffect(() => {
        // Refresh your state
        setCustomState(getCustomState());
    }, [pluginRevision]);
};
```

**Advantages:**

-   ✅ **Universal**: Any plugin receives `pluginRevision` prop
-   ✅ **Simple**: Single counter, single global function
-   ✅ **Consistent**: Similar to `treeRevision` pattern already in PromptApp
-   ✅ **Zero polling**: React handles updates
-   ✅ **Instant updates**: Uses `flushSync()`
-   ✅ **No new concepts**: Uses existing patterns

**Disadvantages:**

-   ⚠️ **Props threading**: Need to pass `pluginRevision` through component tree
-   ⚠️ **Global updates**: All plugins with the prop re-render (but efficient)
-   ⚠️ **Global function**: Uses `globalThis` (but already used for other features)

---

### ✅ Option 4: Plugin State Manager Service

Create a **centralized service** with subscription capabilities:

```typescript
// plugin-state-manager.ts
type StateChangeListener = () => void;

class PluginStateManager {
    private revision = 0;
    private listeners = new Set<StateChangeListener>();

    subscribe(listener: StateChangeListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyChange() {
        this.revision++;
        this.listeners.forEach((listener) => listener());
    }

    getRevision() {
        return this.revision;
    }
}

export const pluginStateManager = new PluginStateManager();
```

**Usage in ANY plugin:**

```typescript
// Tasks.tsx
export const TasksDisplay = ({ node, options, events }) => {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    useEffect(() => {
        return pluginStateManager.subscribe(() => {
            forceUpdate(); // Re-render this component
        });
    }, []);

    // Component automatically re-renders when any plugin state changes
};

// task-store.ts
export function addDynamicTaskToList(taskListId: string, task: any) {
    // ... add task
    pluginStateManager.notifyChange();
}
```

**Advantages:**

-   ✅ **Universal**: Any plugin can subscribe
-   ✅ **Fine-grained**: Plugins only re-render if they subscribe
-   ✅ **Simple API**: `subscribe()` and `notifyChange()`
-   ✅ **No props**: Doesn't require threading props
-   ✅ **Testable**: Easy to mock and test

**Disadvantages:**

-   ⚠️ **Manual subscriptions**: Each plugin must subscribe
-   ⚠️ **Not React-idiomatic**: Bypasses React's data flow
-   ⚠️ **Cleanup management**: Must remember to unsubscribe

---

## Recommendation: Option 3 (Generic Revision Counter)

**Why this is the best choice for a generic system:**

1. **Already established pattern**: PromptApp already uses `treeRevision` for tree updates
2. **Minimal changes**: Just add one counter and one global function
3. **Universal**: Every plugin gets `pluginRevision` automatically via props
4. **Simple**: Plugin authors just call `__notifyPluginStateChange()`
5. **Consistent**: Follows existing architecture patterns
6. **No new concepts**: Developers already understand this pattern

### Comparison

| Feature                  | Option 2 (Context) | Option 3 (Revision) | Option 4 (Manager) |
| ------------------------ | ------------------ | ------------------- | ------------------ |
| Universal                | ✅                 | ✅                  | ✅                 |
| Simple API               | ✅                 | ✅                  | ✅                 |
| Consistent with codebase | ⚠️                 | ✅✅                | ⚠️                 |
| Props threading          | Not needed         | Required            | Not needed         |
| New concepts             | Context            | None                | Service pattern    |
| Setup complexity         | Medium             | Low                 | Medium             |

## Implementation Plan

### Phase 1: Add Generic Counter to PromptApp

```typescript
// PromptApp.tsx
export function PromptApp({ onReady }: PromptAppProps) {
    const [treeRevision, setTreeRevision] = useState(0);
    const [pluginRevision, setPluginRevision] = useState(0); // Add this

    // Expose global notifier
    useEffect(() => {
        (globalThis as any).__notifyPluginStateChange = () => {
            flushSync(() => {
                setPluginRevision((prev) => prev + 1);
            });
        };

        return () => {
            delete (globalThis as any).__notifyPluginStateChange;
        };
    }, []);

    // Pass to tree
    return (
        <RecursiveGroupContainer
            item={currentTree.root}
            pluginRevision={pluginRevision}
            // ... other props
        />
    );
}
```

### Phase 2: Thread Through Components

```typescript
// RecursiveGroupContainer.tsx
export function RecursiveGroupContainer({
    item,
    pluginRevision, // Add this
    // ... other props
}: RecursiveGroupContainerProps) {

    // Pass to PluginWrapper
    <PluginWrapper
        pluginType={item.fieldType}
        pluginRevision={pluginRevision}
        {...item.properties}
    />

    // Pass to child groups recursively
    <RecursiveGroupContainer
        item={child}
        pluginRevision={pluginRevision}
        // ... other props
    />
}
```

### Phase 3: Update PluginWrapper

```typescript
// PluginWrapper.tsx
function transformPropsToStructure(props: Record<string, any>) {
    const nodeProps = [
        "state",
        "pluginRevision", // Add this
        // ... other node props
    ];
    // ... rest of function
}
```

### Phase 4: Use in Tasks Plugin

```typescript
// Tasks.tsx
export const TasksDisplay = ({ node, options, events }) => {
    const [dynamicTasks, setDynamicTasks] = useState([]);
    const [taskStates, setTaskStates] = useState(new Map());

    // Update when pluginRevision changes
    useEffect(() => {
        setDynamicTasks(getDynamicTasksForList(taskListId));
        setTaskStates(getAllTaskStatesForList(taskListId));
    }, [node.pluginRevision, taskListId]);

    // Remove all polling logic!
};

// task-store.ts
export function addDynamicTaskToList(taskListId: string, task: any) {
    // ... add task

    // Notify all plugins to update
    if ((globalThis as any).__notifyPluginStateChange) {
        (globalThis as any).__notifyPluginStateChange();
    }
}
```

### Phase 5: Document for Plugin Authors

```typescript
/**
 * PLUGIN STATE UPDATES
 *
 * If your plugin needs to update state externally (outside of React),
 * use the global notifier:
 *
 * @example
 * // In your plugin's store/service
 * export function updateExternalState(data: any) {
 *     // Update your state
 *     globalState.data = data;
 *
 *     // Notify React to re-render
 *     if ((globalThis as any).__notifyPluginStateChange) {
 *         (globalThis as any).__notifyPluginStateChange();
 *     }
 * }
 *
 * // In your plugin component
 * export const MyPlugin = ({ node, options, events }) => {
 *     useEffect(() => {
 *         // Refresh when pluginRevision changes
 *         setMyState(getMyExternalState());
 *     }, [node.pluginRevision]);
 * };
 */
```

## Benefits

**For Plugin Authors:**

-   🎯 Simple API: Call one function to trigger updates
-   📖 Clear documentation: Easy to understand and use
-   🔌 Universal: Works the same for all plugins
-   ⚡ Instant: Updates appear immediately

**For Performance:**

-   🚀 Zero polling overhead
-   💾 Minimal re-renders: React optimizes updates
-   🎨 Smooth: No polling jank

**For Architecture:**

-   🏗️ Consistent: Follows existing patterns
-   📦 Contained: Changes limited to specific areas
-   🧪 Testable: Easy to test and mock

## Alternative: Hybrid Approach

If you want **finer-grained control**, combine with Option 4:

```typescript
// Specific revision counters for specific plugins
const [pluginRevision, setPluginRevision] = useState(0); // Generic
const [tasksRevision, setTasksRevision] = useState(0); // Specific

// Multiple notifiers
(globalThis as any).__notifyPluginStateChange = () => {
    flushSync(() => setPluginRevision((prev) => prev + 1));
};

(globalThis as any).__notifyTasksStateChange = () => {
    flushSync(() => setTasksRevision((prev) => prev + 1));
};
```

But this adds complexity. **Start with Option 3**, optimize later if needed.

## Questions?

-   **Will all plugins re-render?** Only plugins that use `node.pluginRevision` in their dependencies
-   **What about performance?** React optimizes re-renders; only plugins with changed data will actually update DOM
-   **Can plugins opt-out?** Yes, just don't use `node.pluginRevision` in your effects
-   **Breaking changes?** No - `pluginRevision` is a new optional prop
