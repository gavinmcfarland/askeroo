# Plugin State Context - Quick Guide

## The Key Question

**"Where does your plugin's state live?"**

### Use Plugin State Context if:

-   ✅ State lives **outside the component** (global store, service, external variable)
-   ✅ State is updated **from outside the component** (e.g., `tasks.add()`, external APIs)

### Don't use it if:

-   ❌ State lives **inside the component** (local `useState`)
-   ❌ Component is **self-contained** (manages its own state)

## Two Patterns

### Pattern 1: Tasks (Stateful Updates)

**Use when:** Component manages state that updates based on external changes

```typescript
import { usePluginState } from "askeroo/core";

export const MyPlugin = ({ node, options, events }) => {
    const { revision } = usePluginState();
    const [items, setItems] = useState([]);

    // Update local state when external state changes
    useEffect(() => {
        setItems(getExternalItems());
    }, [revision]);

    return <Box>{items.map(...)}</Box>;
};
```

**Store triggers update:**

```typescript
import { getPluginStateNotifier } from "askeroo/core";

export function addItem(item: Item) {
    externalStore.push(item);

    // Notify components
    getPluginStateNotifier()?.();
}
```

---

### Pattern 2: Completed Fields (Render-time Read)

**Use when:** Component just displays external data (prevents flicker)

```typescript
import { usePluginState, getPluginStateNotifier } from "askeroo/core";

// Component reads external data
export const MyPlugin = ({ node, options, events }) => {
    const { revision } = usePluginState();

    // Read data DURING RENDER (not in effect)
    const items = getExternalItems();

    // revision triggers re-renders
    void revision;

    return <Box>{items.map(...)}</Box>;
};

// External code triggers updates (e.g., in PromptApp or store)
function onDataChanged() {
    // Update external source
    treeManager.updateNode(id, { completed: true });

    // Notify plugins atomically
    flushSync(() => {
        setTreeRevision(prev => prev + 1);
        notifyChange();  // Triggers MyPlugin to re-render
    });
}
```

**Why no `useEffect`?**

-   Reading during render = single render cycle
-   Reading in effect = two render cycles = flicker
-   If you're just displaying data, read during render!

---

## API

### In Components

```typescript
import { usePluginState } from "askeroo/core";

const { revision } = usePluginState();
// Component re-renders when revision changes
```

### In Stores/Services

```typescript
import { getPluginStateNotifier } from "askeroo/core";

const notifyChange = getPluginStateNotifier();
if (notifyChange) {
    notifyChange(); // Triggers instant re-render
}
```

## Real Examples

### ✅ Tasks Plugin

-   **State location:** `task-store.ts` (external)
-   **Updates from:** `tasks.add()` API
-   **Pattern:** Stateful updates with `useEffect`
-   **Why:** Manages dynamic task list state

### ✅ Completed Fields Plugin

-   **State location:** Tree manager (external)
-   **Updates from:** Field submissions, back navigation
-   **Pattern:** Render-time read
-   **Why:** Just displays data, no internal state

### ❌ Text Plugin

-   **State location:** Inside component (`const [value, setValue] = useState()`)
-   **Updates from:** User typing (internal)
-   **Pattern:** Regular React state
-   **Why:** Self-contained input field

## Decision Tree

```
Does your plugin have state?
    │
    ├─ No → Don't use Plugin State Context
    │
    └─ Yes → Where does the state live?
           │
           ├─ Inside component (useState) → Don't use Plugin State Context
           │
           └─ Outside component (store/service/global) → Use Plugin State Context!
                  │
                  └─ Which pattern?
                         │
                         ├─ Managing stateful updates? → Pattern 1 (useEffect)
                         │
                         └─ Just displaying data? → Pattern 2 (render-time read)
```

## Quick Reference

| Scenario                 | State Location  | Pattern          | Use Context? |
| ------------------------ | --------------- | ---------------- | ------------ |
| Dynamic tasks            | External store  | useEffect        | ✅ Yes       |
| Completed fields display | Tree manager    | Render-time read | ✅ Yes       |
| Text input               | Component-local | useState         | ❌ No        |
| Progress monitor         | External store  | useEffect        | ✅ Yes       |
| Static note              | None            | Direct render    | ❌ No        |

## Common Mistakes

### ❌ Mistake 1: Using context for local state

```typescript
// Don't do this!
const { revision } = usePluginState();
const [value, setValue] = useState(""); // Local state

// User types
setValue(newValue); // This is fine on its own!
```

**Why wrong:** Local state works fine with regular React. No need for context.

---

### ❌ Mistake 2: Reading in effect (causes flicker)

```typescript
// Don't do this for display-only plugins!
useEffect(() => {
    setData(getExternalData()); // Two render cycles
}, [revision]);
```

**Why wrong:** Creates flicker. Read during render instead!

---

### ✅ Correct: Render-time read

```typescript
// Do this instead!
const data = getExternalData(); // One render cycle
void revision; // Triggers re-render
```

## Summary

**The rule is simple:**

-   **External state?** → Use Plugin State Context
-   **Internal state?** → Use regular `useState`

**For external state:**

-   **Stateful updates?** → Use `useEffect`
-   **Display only?** → Read during render

That's it! 🎉
