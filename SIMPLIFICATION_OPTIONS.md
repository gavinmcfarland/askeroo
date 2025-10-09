# Simplification Options for Prompt State Management

## Current Complexity

### Two Different Patterns (Confusing!)

**Tasks:**

```typescript
const { revision } = usePromptState();
const [tasks, setTasks] = useState([]);
useEffect(() => {
    setTasks(getTasksFromStore());
}, [revision]);
```

-   4 lines of boilerplate
-   Manual state + effect management

**CompletedFields:**

```typescript
const { revision } = usePromptState();
const data = getCompletedFieldsData();
void revision; // ← Awkward!
```

-   3 lines
-   Weird `void revision` trick

### Issues

1. **Two patterns** - developers don't know which to use
2. **Boilerplate** - repetitive code
3. **Awkward `void revision`** - not intuitive
4. **Manual management** - easy to get wrong

## Simplification Options

### 🏆 Option 1: useSyncExternalStore (RECOMMENDED)

React 18 has a **built-in hook** for exactly this! You're already on React 18.2.0.

**Implementation:**

```typescript
// src/core/plugin-state-context.tsx
import { useSyncExternalStore } from "react";

// Refactor to subscription model
class PromptStateManager {
    private listeners = new Set<() => void>();

    subscribe = (callback: () => void) => {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    };

    notify = () => {
        this.listeners.forEach((cb) => cb());
    };
}

const manager = new PromptStateManager();

// New simple hook!
export function usePromptData<T>(getSnapshot: () => T): T {
    return useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
}

export function notifyPromptStateChange() {
    manager.notify();
}
```

**Usage - Same for BOTH!**

```typescript
// Tasks - 1 line!
const tasks = usePromptData(() => getTasksFromStore());

// CompletedFields - 1 line!
const data = usePromptData(() => getCompletedFieldsData());
```

**Benefits:**

-   ✅ **1 line instead of 3-4**
-   ✅ **Single pattern** for all cases
-   ✅ **No `void revision`** awkwardness
-   ✅ **No manual `useEffect`**
-   ✅ **No manual `useState`**
-   ✅ **React's built-in** (well-tested, optimized)
-   ✅ **Concurrent mode ready** (prevents tearing)
-   ✅ **Prevents flicker** automatically

---

### Option 2: Custom Wrapper Hook

```typescript
export function usePromptData<T>(getData: () => T): T {
    const { revision } = usePromptState();

    // Always read during render (no flicker)
    const data = getData();

    // Hidden: trigger re-render when revision changes
    void revision;

    return data;
}
```

**Usage:**

```typescript
// Same for both!
const tasks = usePromptData(() => getTasksFromStore());
const data = usePromptData(() => getCompletedFieldsData());
```

**Benefits:**

-   ✅ 1 line instead of 3
-   ✅ Single pattern
-   ✅ Hides `void revision`
-   ❌ Still using revision trick internally
-   ❌ Not leveraging React optimizations

---

### Option 3: Just Always Read During Render

Force everyone to use the CompletedFields pattern:

```typescript
// Update docs to say: always read during render
const { revision } = usePromptState();
const data = getData();
void revision;
```

**Benefits:**

-   ✅ Single pattern
-   ❌ Still 3 lines
-   ❌ Still has `void revision` awkwardness
-   ❌ No real simplification

---

## Detailed Analysis: Option 1 (useSyncExternalStore)

### Current vs Proposed

**CURRENT:**

```typescript
// Context with revision counter
const PromptStateContext = createContext({
    revision: 0,
    notifyChange: () => {},
});

export function usePromptState() {
    return useContext(PromptStateContext);
}

// In component - Tasks
const { revision } = usePromptState();
const [tasks, setTasks] = useState([]);
useEffect(() => {
    setTasks(getTasks());
}, [revision]);

// In component - CompletedFields
const { revision } = usePromptState();
const data = getData();
void revision;

// In store
getPromptStateNotifier()?.();
```

**PROPOSED:**

```typescript
// Manager with subscription model
class PromptStateManager {
    private listeners = new Set<() => void>();

    subscribe(callback: () => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach((cb) => cb());
    }
}

const manager = new PromptStateManager();

// Single unified hook using React's built-in
export function usePromptData<T>(getSnapshot: () => T): T {
    return useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
}

// In component - BOTH use same pattern!
const tasks = usePromptData(() => getTasks());
const data = usePromptData(() => getData());

// In store - simpler!
notifyPromptStateChange();
```

### Benefits Breakdown

**Lines of Code:**

-   Tasks: 4 lines → 1 line (75% reduction)
-   CompletedFields: 3 lines → 1 line (67% reduction)

**API Simplicity:**

-   Old: 2 hooks (`usePromptState`, manual management)
-   New: 1 hook (`usePromptData`)

**Store API:**

-   Old: `const n = getPromptStateNotifier(); if (n) n();` (3 lines)
-   New: `notifyPromptStateChange();` (1 line)

**Pattern Consistency:**

-   Old: 2 different patterns (confusing)
-   New: 1 pattern for everything (clear)

**React Integration:**

-   Old: Manual context + revision counter
-   New: React's built-in solution

### Implementation Effort

**Files to change:**

1. `src/core/plugin-state-context.tsx` - Refactor to subscription model
2. `src/built-ins/tasks/Tasks.tsx` - Change to `usePromptData`
3. `src/built-ins/completed-fields/index.tsx` - Change to `usePromptData`
4. `src/built-ins/tasks/task-store.ts` - Simpler notifier call
5. `src/built-ins/completed-fields/completed-fields-store.ts` - Simpler notifier call
6. Update documentation examples

**Estimated time:** 30-45 minutes
**Risk:** Low (just refactoring internals, same behavior)

### Example Code After Migration

**Tasks:**

```typescript
// Before: 4 lines
const { revision } = usePromptState();
const [dynamicTasks, setDynamicTasks] = useState([]);
useEffect(() => {
    setDynamicTasks(getDynamicTasksForList(taskListId));
}, [revision, taskListId]);

// After: 1 line!
const dynamicTasks = usePromptData(() => getDynamicTasksForList(taskListId));
```

**CompletedFields:**

```typescript
// Before: 3 lines
const { revision } = usePromptState();
const allFields = getCompletedFieldsData();
void revision;

// After: 1 line!
const allFields = usePromptData(() => getCompletedFieldsData());
```

**Store:**

```typescript
// Before: 3 lines
const notifyChange = getPromptStateNotifier();
if (notifyChange) {
    notifyChange();
}

// After: 1 line!
notifyPromptStateChange();
```

## Recommendation

**Use Option 1: useSyncExternalStore**

### Why?

1. ✅ **React's solution** - Designed for exactly this use case
2. ✅ **Dramatic simplification** - 1 line instead of 3-4
3. ✅ **Single pattern** - No more confusion
4. ✅ **Better performance** - React optimizes automatically
5. ✅ **Future-proof** - Concurrent mode compatible
6. ✅ **No breaking changes** - Just better internals

### Migration Plan

1. Refactor `PromptStateContext` to use subscription model
2. Add `usePromptData` hook using `useSyncExternalStore`
3. Update tasks prompt to use `usePromptData`
4. Update completedFields prompt to use `usePromptData`
5. Simplify store notifier API
6. Update documentation

### Before/After Comparison

| Aspect                | Current     | With useSyncExternalStore |
| --------------------- | ----------- | ------------------------- |
| **Lines per prompt**  | 3-4 lines   | 1 line                    |
| **Patterns**          | 2 different | 1 unified                 |
| **`void revision`**   | Needed      | Gone                      |
| **Manual effects**    | Required    | Automatic                 |
| **Store notifier**    | 3 lines     | 1 line                    |
| **React integration** | Custom      | Built-in                  |

**Should I implement this simplification?**
