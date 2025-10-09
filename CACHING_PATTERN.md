# Caching Pattern for useSyncExternalStore

## Why Caching is Required

`useSyncExternalStore` uses `Object.is()` to compare snapshots. If your data function returns **new instances** each time, it creates an infinite loop:

```typescript
// ❌ INFINITE LOOP!
const data = usePromptData(() => getData());

function getData() {
    return [1, 2, 3]; // New array every call!
}

// What happens:
Object.is([1, 2, 3], [1, 2, 3]); // false - different instances!
// → Re-render → Call getData() → New instance → Repeat forever!
```

## The Solution: Cache Stable Instances

Return the **same instance** until data actually changes:

```typescript
let cache = null;
let cacheInvalid = true;

function getData() {
    // Return cached instance if valid
    if (!cacheInvalid && cache !== null) {
        return cache; // Same instance!
    }

    // Generate fresh data
    const data = [1, 2, 3];

    // Cache it
    cache = data;
    cacheInvalid = false;

    return data;
}

// When data changes
function updateData(newData) {
    myStore = newData;
    cacheInvalid = true; // Invalidate
    notifyPromptStateChange(); // Notify
}
```

## Pattern Implementation

### For Single Data Source

```typescript
// completed-fields-store.ts example

// Cache variables
let cachedData: Array<any> | null = null;
let cacheInvalidated = true;

// Getter with caching
export function getCompletedFieldsData() {
    // Return cached if valid
    if (!cacheInvalidated && cachedData !== null) {
        return cachedData;
    }

    // Generate fresh
    const fields = buildFieldsArray();

    // Cache it
    cachedData = fields;
    cacheInvalidated = false;

    return fields;
}

// Invalidate when data changes
export function clearCompletedFieldsStore() {
    // Update data
    globalStore = { ... };

    // Invalidate
    cacheInvalidated = true;
    cachedData = null;

    // Notify
    notifyPromptStateChange();
}
```

### For Multiple Data Sources (Per-ID Caching)

```typescript
// task-store.ts example

// Per-taskListId caching
let dynamicTasksCache = new Map<string, Array<any>>();
let taskStatesCache = new Map<string, Map<string, any>>();
let cacheInvalidated = new Set<string>();

// Invalidate specific taskList
function invalidateTaskListCache(taskListId: string) {
    cacheInvalidated.add(taskListId);
    dynamicTasksCache.delete(taskListId);
    taskStatesCache.delete(taskListId);
}

// Getter with per-ID caching
export function getDynamicTasksForList(taskListId: string) {
    // Return cached if valid
    if (
        !cacheInvalidated.has(taskListId) &&
        dynamicTasksCache.has(taskListId)
    ) {
        return dynamicTasksCache.get(taskListId)!;
    }

    // Generate fresh
    const tasks = globalStore.get(taskListId) || [];

    // Cache it
    dynamicTasksCache.set(taskListId, tasks);
    cacheInvalidated.delete(taskListId);

    return tasks;
}

// Update invalidates cache
export function addDynamicTask(taskListId: string, task: any) {
    // Update data
    globalStore.get(taskListId).push(task);

    // Invalidate this specific taskList
    invalidateTaskListCache(taskListId);

    // Notify
    notifyPromptStateChange();
}
```

## When to Use Caching

### ✅ Need Caching When:

Your getter returns:

-   Arrays: `[...]`
-   Objects: `{...}`
-   Maps: `new Map(...)`
-   Sets: `new Set(...)`
-   Any new instance each call

### ❌ Don't Need Caching When:

Your getter returns:

-   Primitives: `string`, `number`, `boolean`
-   Stable references: `const CONSTANT = [...]`
-   Already cached: Reading from a stable store

## Example: When NOT to Cache

```typescript
// Primitive - no caching needed
export function getCount(): number {
    return globalStore.count; // Number is compared by value
}

const count = usePromptData(() => getCount());
// Works fine - numbers compare with ===
```

## Common Mistake

```typescript
// ❌ Don't do this - creates new Map every time!
const taskStates = usePromptData(
    () => new Map(getAllTaskStatesForList(taskListId))
);
```

```typescript
// ✅ Do this - return stable instance
export function getAllTaskStatesForList(taskListId: string) {
    // Cache it!
    if (cache.has(taskListId)) return cache.get(taskListId);

    const states = allTaskStates.get(taskListId) || new Map();
    cache.set(taskListId, states);
    return states;
}

const taskStates = usePromptData(() => getAllTaskStatesForList(taskListId));
```

## Debugging Infinite Loops

If you see "Maximum update depth exceeded":

1. **Find the prompt** - Check the error stack trace
2. **Check the getter** - What does `usePromptData` call?
3. **Look for new instances** - Arrays, objects, Maps?
4. **Add caching** - Return stable instances
5. **Invalidate on changes** - Clear cache when data updates

## Pattern Checklist

For every prompt using `usePromptData`:

-   [ ] Getter returns new instances? (arrays/objects/Maps)
-   [ ] If yes: Add caching
-   [ ] Cache invalidated when data changes?
-   [ ] Cache cleared in cleanup/reset functions?
-   [ ] Tested: No infinite loops?

## Complete Example

```typescript
// Store with caching
let cache: MyData | null = null;
let invalid = true;

export function getData(): MyData {
    if (!invalid && cache) return cache;

    const data = buildData(); // Expensive operation
    cache = data;
    invalid = false;
    return data;
}

export function updateData(newData: MyData) {
    myGlobalStore = newData;
    invalid = true;
    cache = null;
    notifyPromptStateChange();
}

export function clearData() {
    myGlobalStore = {};
    invalid = true;
    cache = null;
    notifyPromptStateChange();
}

// Component - simple!
const data = usePromptData(() => getData());
```

## Benefits of This Pattern

1. ✅ **Prevents infinite loops** - Stable instances
2. ✅ **Performance** - Data only rebuilt when invalidated
3. ✅ **Simple component code** - Still just 1 line!
4. ✅ **Smart re-renders** - Only when data changes

## Summary

**The trade-off:**

-   Revision-based: No caching needed, but more code (3-4 lines)
-   useSyncExternalStore: Need caching, but much less code (1 line)

**The verdict:** The dramatic simplification (1 line vs 3-4) is worth the simple caching pattern!

**For prompt authors:** Just remember to cache data that returns new instances, and invalidate when data changes. That's it!
