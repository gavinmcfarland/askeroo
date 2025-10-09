# Revision-based vs useSyncExternalStore Comparison

## Core Mechanism Comparison

### Revision-based (Previous)

**How it worked:**

```typescript
// Context stored a revision counter
const PromptStateContext = createContext({
    revision: 0,
    notifyChange: () => {},
});

// When notified, increment the revision
const notifyChange = () => {
    flushSync(() => {
        setRevision((prev) => prev + 1); // 0 → 1 → 2 → 3...
    });
};

// Components watched the revision number
const { revision } = usePromptState();

// When revision changed, trigger side effects or re-renders
useEffect(() => {
    // revision changed from 5 → 6, so refresh data
    setData(getData());
}, [revision]);
```

**Key insight:** Used a **number that increments** to signal changes. Components detected the number changed and reacted.

---

### useSyncExternalStore (Current)

**How it works:**

```typescript
// Manager stores listeners (subscribers)
class PromptStateManager {
    private listeners = new Set<() => void>();

    subscribe(callback: () => void) {
        this.listeners.add(callback); // Add subscriber
        return () => this.listeners.delete(callback); // Cleanup
    }

    notify() {
        this.listeners.forEach((cb) => cb()); // Call all subscribers
    }
}

// When notified, call all subscribers directly
notifyPromptStateChange(); // Calls all listeners

// Components subscribe and read data
const data = usePromptData(() => getData());
// React handles: subscribe, read, compare, re-render automatically
```

**Key insight:** Uses a **subscription model** where components directly subscribe to be notified. React's `useSyncExternalStore` handles everything.

---

## Detailed Comparison

### Architecture

| Aspect           | Revision-based              | useSyncExternalStore       |
| ---------------- | --------------------------- | -------------------------- |
| **Signal type**  | Number counter (0, 1, 2...) | Direct callbacks           |
| **Storage**      | Context with state          | Manager with listeners set |
| **Notification** | Increment number            | Call all subscribers       |
| **Subscription** | Watch revision value        | Add callback to set        |
| **Comparison**   | Number changed?             | Data changed? (Object.is)  |
| **Built by**     | Custom implementation       | React core                 |

### Component Code

**Revision-based:**

```typescript
// Tasks (Pattern 1)
const { revision } = usePromptState();
const [data, setData] = useState([]);
useEffect(() => {
    setData(getData());
}, [revision]); // When revision changes, update

// CompletedFields (Pattern 2)
const { revision } = usePromptState();
const data = getData();
void revision; // Trigger re-render when revision changes
```

**useSyncExternalStore:**

```typescript
// BOTH use same pattern!
const data = usePromptData(() => getData());
```

### Store Code

**Revision-based:**

```typescript
const notifyChange = getPromptStateNotifier();
if (notifyChange) {
    notifyChange(); // Triggers setRevision(prev => prev + 1)
}
```

3 lines with null check

**useSyncExternalStore:**

```typescript
notifyPromptStateChange(); // Triggers listeners.forEach(cb => cb())
```

1 line, simpler

### How Re-renders Happen

**Revision-based:**

```
Store calls notifyChange()
    ↓
Context increments revision: 5 → 6
    ↓
Context provider re-renders all consumers
    ↓
Components see new revision value (6)
    ↓
useEffect dependency changes: [5] → [6]
    ↓
useEffect runs → setData(getData())
    ↓
Component re-renders with new data
```

**useSyncExternalStore:**

```
Store calls notifyPromptStateChange()
    ↓
Manager calls all listeners
    ↓
Each subscribed component's callback fires
    ↓
useSyncExternalStore re-reads getData()
    ↓
Compares with Object.is()
    ↓
If different, component re-renders with new data
```

### Key Differences

#### 1. **Two Steps vs One Step**

**Revision:**

-   Step 1: Revision changes → trigger effect
-   Step 2: Effect runs → update state → re-render
-   **Two render cycles** (unless using `void revision` trick)

**useSyncExternalStore:**

-   Step 1: Listener fires → re-read → re-render
-   **One render cycle**

#### 2. **Manual vs Automatic**

**Revision:**

-   Manual: Write `useEffect`, manage `useState`, handle dependencies
-   Error-prone: Forget dependency? Stale data!

**useSyncExternalStore:**

-   Automatic: React handles everything
-   Safe: Can't mess up dependencies

#### 3. **Pattern Consistency**

**Revision:**

-   Two patterns: `useEffect` for stateful, `void revision` for direct read
-   Confusing: Which do I use?

**useSyncExternalStore:**

-   One pattern: Always `usePromptData(() => getData())`
-   Clear: Same for everyone!

#### 4. **Comparison Method**

**Revision:**

-   Compares revision numbers: `5 !== 6` → always triggers
-   Blind: Doesn't know if data actually changed
-   Can cause unnecessary re-renders

**useSyncExternalStore:**

-   Compares actual data with `Object.is()`
-   Smart: Only re-renders if data changed
-   More efficient (when data is stable)

**Caveat:** Requires stable references! That's why we added caching for completedFields.

---

## Which is Better?

### useSyncExternalStore Wins Because:

1. ✅ **One line** instead of 3-4
2. ✅ **Single pattern** - no confusion
3. ✅ **React's built-in** - battle-tested
4. ✅ **Automatic management** - can't get dependencies wrong
5. ✅ **Concurrent mode ready** - prevents tearing
6. ✅ **Smarter re-renders** - compares actual data

### BUT Requires:

1. ⚠️ **Stable references** - need to cache or memoize data that returns new instances
2. ⚠️ **React 18+** - not available in older versions (but you're on 18.2.0)

---

## The Caching Trade-off

### Why Caching is Needed

```typescript
// Without cache - INFINITE LOOP!
const data = usePromptData(() => getCompletedFieldsData());

// getCompletedFieldsData returns:
return [{ id: "1", label: "Name", value: "John" }]; // New array every time!

// useSyncExternalStore sees:
Object.is(oldArray, newArray); // false - different instances!
// → Re-render
// → Call getData again
// → New array instance again
// → Infinite loop!
```

### With Cache - STABLE!

```typescript
// First call
const fields = getCompletedFieldsData(); // → [{ ... }] (cached)

// Second call
const fields = getCompletedFieldsData(); // → Same array instance!

// useSyncExternalStore sees:
Object.is(cachedArray, cachedArray); // true - same instance!
// → No re-render (unless data changed)
```

### When to Invalidate

```typescript
// When data actually changes:
invalidateCompletedFieldsCache(); // Clear cache
notifyPromptStateChange(); // Notify subscribers

// Next call to getCompletedFieldsData:
// → Cache is invalid
// → Generate fresh data
// → Cache it
// → Return new instance
// → useSyncExternalStore detects change
// → Re-render!
```

---

## Comparison Summary

| Feature                 | Revision-based       | useSyncExternalStore    |
| ----------------------- | -------------------- | ----------------------- |
| **Complexity**          | Medium (2 patterns)  | Low (1 pattern)         |
| **Lines of code**       | 3-4 per prompt       | 1 per prompt            |
| **Manual management**   | Required             | Automatic               |
| **Pattern consistency** | 2 different patterns | 1 unified pattern       |
| **Awkward code**        | `void revision`      | None                    |
| **React integration**   | Custom               | Built-in                |
| **Comparison method**   | Counter changed?     | Data changed?           |
| **Efficiency**          | Always re-renders    | Only when data changed  |
| **Requires caching**    | No                   | Yes (for new instances) |
| **Concurrent mode**     | Not designed for it  | Ready                   |
| **Trade-offs**          | Simple but verbose   | Requires stable refs    |

---

## Practical Impact

### For Tasks Prompt

**Revision:**

-   8 lines of code
-   Manual state management
-   Two useState, one useEffect

**useSyncExternalStore:**

-   2 lines of code
-   Automatic management
-   No useState, no useEffect needed

**Winner:** useSyncExternalStore (75% less code)

---

### For CompletedFields Prompt

**Revision:**

-   3 lines of code
-   Awkward `void revision`
-   Works but confusing

**useSyncExternalStore:**

-   1 line of code
-   Clean and clear
-   Requires caching (added)

**Winner:** useSyncExternalStore (67% less code, but needs cache)

---

### For Stores

**Revision:**

```typescript
const notifyChange = getPromptStateNotifier();
if (notifyChange) {
    notifyChange();
}
```

3 lines, null check needed

**useSyncExternalStore:**

```typescript
notifyPromptStateChange();
```

1 line, direct call

**Winner:** useSyncExternalStore (67% less code)

---

## Why We Made the Switch

The revision-based approach was **good** - it solved the polling problem and worked well. But it had issues:

1. **Two patterns** - confusing for developers
2. **Boilerplate** - too much code per prompt
3. **`void revision`** - awkward and non-intuitive
4. **Manual management** - easy to get wrong

useSyncExternalStore **solves all these** at the cost of needing stable references (which caching provides).

## Net Result

**Revision-based pros:**

-   ✅ Simple to understand (just a counter)
-   ✅ No caching needed
-   ✅ Works with any data

**useSyncExternalStore pros:**

-   ✅ 1 line instead of 3-4
-   ✅ Single unified pattern
-   ✅ React's built-in (optimized)
-   ✅ Smarter re-renders
-   ✅ Concurrent mode ready

**The trade-off:**

-   ⚠️ Needs stable references (caching)

**Verdict:** The simplicity gain is worth the caching requirement! The cache is simple and only needed for data that returns new instances.

---

## Final Comparison

```typescript
// REVISION-BASED (was)
import { usePromptState, getPromptStateNotifier } from "askeroo/core";

// Component
const { revision } = usePromptState();
const [data, setData] = useState([]);
useEffect(() => {
    setData(getData());
}, [revision]);

// Store
const notifyChange = getPromptStateNotifier();
if (notifyChange) {
    notifyChange();
}
```

```typescript
// useSyncExternalStore (now)
import { usePromptData, notifyPromptStateChange } from "askeroo/core";

// Component
const data = usePromptData(() => getData());

// Store
notifyPromptStateChange();
```

**Result:** Simpler, cleaner, more powerful! ✅
