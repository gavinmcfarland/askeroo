# Prompt State Management - Simplification Analysis

## Current Implementation

### Tasks Pattern

```typescript
// Hook + useEffect pattern
const { revision } = usePromptState();
const [tasks, setTasks] = useState([]);

useEffect(() => {
    setTasks(getTasksFromStore());
}, [revision]);
```

### CompletedFields Pattern

```typescript
// Hook + render-time read
const { revision } = usePromptState();
const data = getCompletedFieldsData();
void revision; // Awkward - just to trigger re-renders
```

## Complexity Issues

### 1. Two Different Patterns

-   Tasks: `useEffect` with local state
-   CompletedFields: Direct read with `void revision`
-   **Confusing** for developers - which pattern to use when?

### 2. Awkward `void revision`

```typescript
void revision; // What does this do? Why is it needed?
```

-   Not intuitive
-   Easy to forget
-   Looks like dead code

### 3. Boilerplate

```typescript
// Every prompt needs this boilerplate
const { revision } = usePromptState();
useEffect(() => { ... }, [revision]);
// Or
void revision;
```

## Potential Simplifications

### Option 1: useSyncExternalStore (React Built-in)

React has a **built-in hook** for exactly this use case!

```typescript
import { useSyncExternalStore } from "react";

// Simple custom hook
export function useExternalStore<T>(getSnapshot: () => T): T {
    const { subscribe } = usePromptState();

    return useSyncExternalStore(
        subscribe, // Subscribe function
        getSnapshot, // Get current value
        getSnapshot // Get server snapshot (same for CLI)
    );
}
```

**Usage in Tasks:**

```typescript
// Before: 3 lines + useEffect
const { revision } = usePromptState();
const [tasks, setTasks] = useState([]);
useEffect(() => {
    setTasks(getTasksFromStore());
}, [revision]);

// After: 1 line!
const tasks = useExternalStore(() => getTasksFromStore());
```

**Usage in CompletedFields:**

```typescript
// Before: 3 lines + void
const { revision } = usePromptState();
const data = getCompletedFieldsData();
void revision;

// After: 1 line!
const data = useExternalStore(() => getCompletedFieldsData());
```

**Benefits:**

-   ✅ Single pattern for both use cases
-   ✅ 1 line instead of 3+
-   ✅ No `void revision` awkwardness
-   ✅ No manual `useEffect` management
-   ✅ Built-in React hook (well-tested, optimized)
-   ✅ Prevents tearing (concurrent mode ready)

---

### Option 2: Custom Hook That Chooses Pattern

```typescript
export function usePromptData<T>(
    getData: () => T,
    options?: { stateful?: boolean }
): T {
    const { revision } = usePromptState();

    if (options?.stateful) {
        // Pattern 1: Stateful updates
        const [data, setData] = useState(getData);
        useEffect(() => {
            setData(getData());
        }, [revision]);
        return data;
    } else {
        // Pattern 2: Direct read
        return getData();
    }
}
```

**Usage:**

```typescript
// Tasks
const tasks = usePromptData(() => getTasksFromStore(), { stateful: true });

// CompletedFields
const data = usePromptData(() => getCompletedFieldsData());
```

**Benefits:**

-   ✅ Single hook
-   ✅ Auto-selects pattern
-   ❌ Still two patterns internally
-   ❌ Magic behavior (confusing)

---

### Option 3: Just Use Direct Read Everywhere

```typescript
// Simplest: Always read during render
export function usePromptData<T>(getData: () => T): T {
    const { revision } = usePromptState();
    void revision; // Hidden in hook
    return getData();
}
```

**Usage:**

```typescript
// Same for both!
const tasks = usePromptData(() => getTasksFromStore());
const data = usePromptData(() => getCompletedFieldsData());
```

**Benefits:**

-   ✅ Single pattern
-   ✅ Simple
-   ❌ Still has `void revision` (just hidden)
-   ❌ Not leveraging React's optimizations

---

## Recommendation: Option 1 (useSyncExternalStore)

### Why?

1. **React's built-in solution** for this exact problem
2. **Single pattern** that works for both use cases
3. **Simpler API** - 1 line instead of 3+
4. **No awkwardness** - no `void revision`
5. **Battle-tested** - part of React core
6. **Future-proof** - concurrent mode ready

### Implementation

```typescript
// plugin-state-context.tsx
export function usePromptData<T>(getSnapshot: () => T): T {
    const context = useContext(PromptStateContext);

    // Subscribe function for useSyncExternalStore
    const subscribe = (callback: () => void) => {
        // This is a bit tricky - we need to watch the revision
        // Could use a subscription model instead
    };

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

Actually, wait - to use useSyncExternalStore properly, we'd need to refactor the context to have a proper subscribe/unsubscribe mechanism.

Let me revise...

### Better Implementation

Change PromptStateContext to support subscriptions:

```typescript
class PromptStateManager {
    private revision = 0;
    private listeners = new Set<() => void>();

    subscribe = (callback: () => void) => {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    };

    notify = () => {
        this.revision++;
        this.listeners.forEach((cb) => cb());
    };

    getSnapshot = () => this.revision;
}

const manager = new PromptStateManager();

// Hook using useSyncExternalStore
export function usePromptData<T>(getSnapshot: () => T): T {
    return useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
}
```

This would be cleaner!

### Comparison

**Current:**

```typescript
// Tasks
const { revision } = usePromptState();
const [tasks, setTasks] = useState([]);
useEffect(() => {
    setTasks(getTasksFromStore());
}, [revision]);

// CompletedFields
const { revision } = usePromptState();
const data = getCompletedFieldsData();
void revision;
```

**With useSyncExternalStore:**

```typescript
// Tasks
const tasks = usePromptData(() => getTasksFromStore());

// CompletedFields
const data = usePromptData(() => getCompletedFieldsData());
```

Both use the same pattern, both are 1 line!

## Questions to Consider

1. Is the added complexity of subscription management worth it?
2. Would this be a breaking change for the two prompts we just migrated?
3. Is `useSyncExternalStore` worth adding as a dependency (React 18 feature)?

Let me check if React 18 is already a dependency...
