# State Management Evolution: Revision vs useSyncExternalStore

## Overview

This document compares two approaches to managing external state in Askeroo prompts:

1. **Old: Revision Counter Pattern** (polling-based)
2. **New: useSyncExternalStore with Automatic Caching** (subscription-based)

---

## The Old Way: Revision Counter Pattern

### How It Worked

```typescript
// 1. Context provided a revision counter
const PromptStateContext = createContext<{
    revision: number;
    notifyChange: () => void;
}>({ revision: 0, notifyChange: () => {} });

// 2. Provider incremented revision on changes
export function PromptStateProvider({ children }) {
    const [revision, setRevision] = useState(0);

    const notifyChange = useCallback(() => {
        setRevision(prev => prev + 1);
    }, []);

    return (
        <PromptStateContext.Provider value={{ revision, notifyChange }}>
            {children}
        </PromptStateContext.Provider>
    );
}

// 3. Components used revision as a dependency
export const TasksDisplay = ({ options }) => {
    const { revision } = usePromptState(); // Get revision from context
    const [tasks, setTasks] = useState([]);

    // Poll for changes whenever revision changes
    useEffect(() => {
        const newTasks = getTasksFromStore();
        setTasks(newTasks);
    }, [revision]); // Re-run when revision changes

    return <Box>{tasks.map(task => ...)}</Box>;
};

// 4. Stores notified context when data changed
export function addTask(task: Task) {
    globalStore.tasks.push(task);
    notifyPromptStateChange(); // Increments revision
}
```

### Architecture

```
Store Update → notifyChange() → revision++ → useEffect triggers → getData() → setState() → Re-render
```

### Problems

#### 1. **Manual State Management**

Every component needed `useState` + `useEffect`:

```typescript
const [tasks, setTasks] = useState([]);
const [taskStates, setTaskStates] = useState(new Map());

useEffect(() => {
    setTasks(getTasksFromStore());
    setTaskStates(getAllTaskStates());
}, [revision]);
```

#### 2. **Two-Render Cycle**

-   First render: Revision changes → triggers useEffect
-   Second render: useEffect updates state → actual re-render
-   Result: **Every update causes 2 renders instead of 1**

#### 3. **Boilerplate Everywhere**

Every component needed the same pattern:

```typescript
const { revision } = usePromptState();
const [data, setData] = useState(initialValue);

useEffect(() => {
    setData(getDataFromStore());
}, [revision]);

// Sometimes with cleanup:
useEffect(() => {
    void revision; // Force dependency
    setData(getDataFromStore());
}, [revision]);
```

#### 4. **No Automatic Optimization**

Components re-rendered even if data didn't actually change:

```typescript
// Revision changes from 5 → 6
useEffect(() => {
    const newTasks = getTasksFromStore(); // Returns [task1, task2]
    setTasks(newTasks); // Sets same tasks → unnecessary re-render
}, [revision]);
```

#### 5. **Prop Drilling / Context Overhead**

Had to wrap everything in `PromptStateProvider` and import `usePromptState` hook in every component.

---

## The New Way: useSyncExternalStore with Automatic Caching

### How It Works

```typescript
// 1. Simple subscription manager (no Context needed!)
class PromptStateManager {
    private listeners = new Set<() => void>();

    subscribe = (callback: () => void) => {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    };

    notify = () => {
        flushSync(() => {
            this.listeners.forEach(cb => cb());
        });
    };
}

const promptStateManager = new PromptStateManager();

// 2. Hook with automatic caching
export function usePromptData<T>(getSnapshot: () => T): T {
    const cacheRef = useRef<{ value: T; json: string } | null>(null);

    const getSnapshotWithCache = () => {
        const newValue = getSnapshot();
        const newJson = serialize(newValue); // Handles Maps, Sets, etc.

        // Only return new instance if content actually changed
        if (cacheRef.current && cacheRef.current.json === newJson) {
            return cacheRef.current.value; // Same data → same instance
        }

        cacheRef.current = { value: newValue, json: newJson };
        return newValue;
    };

    return useSyncExternalStore(
        promptStateManager.subscribe, // Subscribe to changes
        getSnapshotWithCache,          // Get current state
        getSnapshotWithCache           // Get server state (SSR)
    );
}

// 3. Components use one line
export const TasksDisplay = ({ options }) => {
    const tasks = usePromptData(() => getTasksFromStore());
    return <Box>{tasks.map(task => ...)}</Box>;
};

// 4. Stores notify same way
export function addTask(task: Task) {
    globalStore.tasks.push(task);
    notifyPromptStateChange(); // Notifies manager
}
```

### Architecture

```
Store Update → notify() → useSyncExternalStore calls getter → cache check → Re-render (only if changed)
```

### Improvements

#### 1. ✅ **One-Line Component Integration**

```typescript
// Old: 4+ lines of boilerplate
const { revision } = usePromptState();
const [tasks, setTasks] = useState([]);
useEffect(() => {
    setTasks(getTasksFromStore());
}, [revision]);

// New: 1 line!
const tasks = usePromptData(() => getTasksFromStore());
```

#### 2. ✅ **Single-Render Cycle**

-   `useSyncExternalStore` updates immediately during render
-   No `useEffect` → no second render
-   **50% fewer renders!**

#### 3. ✅ **Automatic Caching**

Built-in content comparison prevents unnecessary re-renders:

```typescript
// Store hasn't changed → returns cached instance → no re-render
const tasks = usePromptData(() => getTasksFromStore());
```

#### 4. ✅ **No Manual Cache Management**

Store code is simple:

```typescript
// Old: Manual caching required
let cachedData: Array<any> | null = null;
let cacheInvalidated = true;

export function getData() {
    if (!cacheInvalidated && cachedData) {
        return cachedData;
    }
    const data = /* compute */;
    cachedData = data;
    cacheInvalidated = false;
    return data;
}

export function invalidateCache() {
    cacheInvalidated = true;
    cachedData = null;
}

// New: Just return data!
export function getData() {
    return /* compute */; // That's it!
}
```

#### 5. ✅ **No Context Provider Needed**

```typescript
// Old: Had to wrap everything
<PromptStateProvider>
    <PromptApp />
</PromptStateProvider>;

// New: Provider is empty (for backward compatibility only)
export function PromptStateProvider({ children }) {
    return <>{children}</>; // No-op!
}
```

#### 6. ✅ **Handles Maps/Sets Automatically**

Custom serialization for proper content comparison:

```typescript
const taskStates = usePromptData(() => new Map([...])); // Just works!
```

#### 7. ✅ **Concurrent React Compatible**

`useSyncExternalStore` is designed for React 18's concurrent rendering, preventing "tearing" (visual inconsistencies).

---

## Side-by-Side Code Comparison

### Example: Tasks Plugin

#### OLD: Revision Pattern

```typescript
// Component
export const TasksDisplay = ({ node, options, events }) => {
    const { revision } = usePromptState(); // Get revision
    const [taskStates, setTaskStates] = useState(new Map());
    const [dynamicTasks, setDynamicTasks] = useState([]);

    // Poll for changes
    useEffect(() => {
        setTaskStates(new Map(getAllTaskStatesForList(taskListId)));
        setDynamicTasks(getDynamicTasksForList(taskListId));
    }, [revision, taskListId]); // Re-run when revision changes

    return <Box>...</Box>;
};

// Store (with manual caching)
let taskStatesCache: Map<string, Map<string, any>> = new Map();
let cacheInvalidated = new Set<string>();

export function getAllTaskStatesForList(taskListId: string) {
    if (!cacheInvalidated.has(taskListId) && taskStatesCache.has(taskListId)) {
        return taskStatesCache.get(taskListId)!;
    }
    const states = allTaskStates.get(taskListId) || new Map();
    taskStatesCache.set(taskListId, states);
    cacheInvalidated.delete(taskListId);
    return states;
}

export function updateTaskState(taskListId, taskId, state) {
    const listStates = allTaskStates.get(taskListId) || new Map();
    listStates.set(taskId, state);
    allTaskStates.set(taskListId, listStates);

    // Invalidate cache
    cacheInvalidated.add(taskListId);
    taskStatesCache.delete(taskListId);

    notifyPromptStateChange(); // Increment revision
}
```

**Lines of code:** ~40 (component) + ~30 (store caching) = **70 lines**

#### NEW: useSyncExternalStore

```typescript
// Component
export const TasksDisplay = ({ node, options, events }) => {
    const taskStates = usePromptData(() => getAllTaskStatesForList(taskListId));
    const dynamicTasks = usePromptData(() =>
        getDynamicTasksForList(taskListId)
    );

    return <Box>...</Box>;
};

// Store (no manual caching!)
export function getAllTaskStatesForList(taskListId: string) {
    return allTaskStates.get(taskListId) || new Map();
}

export function updateTaskState(taskListId, taskId, state) {
    const oldListStates = allTaskStates.get(taskListId) || new Map();
    const newListStates = new Map(oldListStates); // New reference
    newListStates.set(taskId, state);
    allTaskStates.set(taskListId, newListStates);

    notifyPromptStateChange(); // Notify subscribers
}
```

**Lines of code:** ~5 (component) + ~10 (store) = **15 lines**

**Reduction: 55 lines removed (79% less code!)**

---

## Performance Comparison

| Metric                 | Revision Pattern              | useSyncExternalStore        |
| ---------------------- | ----------------------------- | --------------------------- |
| Renders per update     | 2 (useEffect cycle)           | 1 (immediate)               |
| Manual caching needed  | Yes (~30 lines/plugin)        | No (automatic)              |
| Unnecessary re-renders | Common (no content check)     | Rare (automatic comparison) |
| Map/Set support        | Manual workarounds            | Built-in                    |
| Concurrent React       | ⚠️ Can cause tearing          | ✅ Tearing-safe             |
| Component boilerplate  | 4+ lines                      | 1 line                      |
| Store complexity       | High (caching + invalidation) | Low (just return data)      |

---

## Migration Path

Moving from revision pattern to useSyncExternalStore was straightforward:

### Step 1: Update Components

```diff
- const { revision } = usePromptState();
- const [tasks, setTasks] = useState([]);
- useEffect(() => {
-     setTasks(getTasksFromStore());
- }, [revision]);
+ const tasks = usePromptData(() => getTasksFromStore());
```

### Step 2: Remove Manual Caching

```diff
- let cachedData: Array<any> | null = null;
- let cacheInvalidated = true;
-
  export function getData() {
-     if (!cacheInvalidated && cachedData) {
-         return cachedData;
-     }
-     const data = /* compute */;
-     cachedData = data;
-     cacheInvalidated = false;
-     return data;
+     return /* compute */; // Just return data!
  }
-
- export function invalidateCache() {
-     cacheInvalidated = true;
-     cachedData = null;
- }
```

### Step 3: Ensure Immutable Updates (for Maps)

```diff
  export function updateState(key, value) {
-     const state = globalState.get(key); // Mutate existing
-     state.set(key, value);
+     const oldState = globalState.get(key);
+     const newState = new Map(oldState); // New reference!
+     newState.set(key, value);
+     globalState.set(key, newState);

      notifyPromptStateChange();
  }
```

---

## Lessons Learned

### Why Revision Pattern Seemed Good Initially

1. **Simple mental model**: "Increment counter → things update"
2. **Familiar**: Similar to Redux's action counter pattern
3. **Worked**: Did the job (with some inefficiency)

### Why useSyncExternalStore Is Better

1. **React 18 native**: Built specifically for this use case
2. **Optimized**: Single-render cycle, tearing-safe
3. **Less code**: 80% reduction in boilerplate
4. **Automatic caching**: No manual cache management
5. **Type-safe**: Better TypeScript integration
6. **Concurrent-safe**: Future-proof for React 19+

### Key Insight

**Revision pattern is a workaround. useSyncExternalStore is the solution.**

React 18 added `useSyncExternalStore` specifically to solve the problem we were using revision counters for. By using the right tool for the job, we get:

-   Better performance
-   Less code
-   Fewer bugs
-   Better developer experience

---

## Conclusion

| Aspect                   | Winner               | Reason                            |
| ------------------------ | -------------------- | --------------------------------- |
| **Performance**          | useSyncExternalStore | 1 render vs 2 renders             |
| **Code simplicity**      | useSyncExternalStore | 80% less code                     |
| **Developer experience** | useSyncExternalStore | 1 line vs 4+ lines per component  |
| **Maintainability**      | useSyncExternalStore | No manual cache logic             |
| **Future-proof**         | useSyncExternalStore | React 18+ native, concurrent-safe |
| **Bug potential**        | useSyncExternalStore | Fewer moving parts                |

**Final verdict:** useSyncExternalStore with automatic caching is **significantly better** than the revision pattern in every measurable way. It's not just an improvement—it's the **correct** solution to the problem.
