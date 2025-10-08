# Plugin State Context - Opportunities Analysis

Analysis of existing and potential plugins that could benefit from the new Plugin State Context system.

## Current Plugins Analysis

### ✅ Tasks Plugin (Migrated)

**Status:** Using Plugin State Context

**Benefit:**

-   Removed 80+ lines of polling
-   0ms latency for dynamic task updates
-   Zero CPU overhead

**See:** `PLUGIN_STATE_CONTEXT_IMPLEMENTATION.md`

---

### ✅ Completed Fields Plugin (Migrated)

**Status:** Using Plugin State Context

**Benefits Achieved:**

-   Removed ~30 lines of dead callback code
-   Consistent with tasks plugin pattern
-   Explicit reactive updates
-   Ready for future programmatic field APIs

**Implementation:**

```typescript
// completed-fields/index.tsx
const { revision } = usePluginState();

useEffect(() => {
    const allFields = getCompletedFieldsData();
    const limited = options.maxFields
        ? allFields.slice(0, options.maxFields)
        : allFields;
    setCompletedFieldsList(limited);
}, [revision, options.maxFields]);
```

**See:** `COMPLETED_FIELDS_MIGRATION.md`

---

### ❌ Input Plugins (text, multi, radio, confirm)

**Status:** Don't need it

**Why Not:**

-   State lives **inside the component** (local `useState`)
-   No external/global state to manage
-   State changes happen internally (user typing, selections)
-   No external code needs to update their state

**Example:**

```typescript
// text/index.tsx - component-local state
const [value, setValue] = useState(initialValue);
// User types -> setValue -> re-render
// No external store, no Plugin State Context needed
```

**Recommendation:** No changes needed

---

### ❌ Note Plugin

**Status:** Don't need it

**Why Not:**

-   Static display only
-   No state changes
-   Just shows text/markdown content

**Recommendation:** No changes needed

---

### ❌ Group Plugin

**Status:** Don't need it

**Why Not:**

-   Container only, no UI state
-   Tree manager handles group state
-   No external updates needed

**Recommendation:** No changes needed

---

## Future Plugin Opportunities

### 🔥 High Value - If You Build These

#### 1. **Progress Monitor Plugin**

Imagine a plugin that shows progress of long-running operations:

```typescript
// Example usage
const progressId = await progress({
    label: "Processing files...",
    total: 100,
});

// In your async code
for (let i = 0; i < 100; i++) {
    await processFile(i);
    updateProgress(progressId, i + 1); // Would use Plugin State Context!
}
```

**Why It Needs Plugin State Context:**

-   External updates (progress changes outside React)
-   Real-time display updates
-   Multiple progress bars updating simultaneously

**Implementation:**

```typescript
// progress-store.ts
export function updateProgress(id: string, current: number) {
    progressMap.set(id, current);

    const notifyChange = getPluginStateNotifier();
    if (notifyChange) {
        notifyChange(); // Instant UI update!
    }
}

// Progress.tsx
const { revision } = usePluginState();

useEffect(() => {
    setProgress(getProgress(progressId));
}, [revision, progressId]);
```

---

#### 2. **Live Data Feed Plugin**

Real-time data display (logs, metrics, events):

```typescript
// Example usage
await liveFeed({
    label: "Server Logs",
    source: logStream,
});

// Elsewhere
logStream.push("New log entry"); // Would trigger Plugin State Context!
```

**Why It Needs Plugin State Context:**

-   External data source
-   Continuous updates
-   Real-time display

---

#### 3. **Status Dashboard Plugin**

Multiple status indicators that update independently:

```typescript
await statusDashboard({
    services: ["api", "database", "cache"],
});

// External monitoring
updateServiceStatus("api", "healthy"); // Would use context!
updateServiceStatus("database", "degraded");
```

**Why It Needs Plugin State Context:**

-   External status updates
-   Multiple independent values
-   Real-time monitoring

---

#### 4. **Dynamic List Plugin**

A list that can be modified externally:

```typescript
const listId = await dynamicList({
    label: "Queue",
    items: [],
});

// External updates
addToList(listId, "New item");
removeFromList(listId, "Old item");
```

**Why It Needs Plugin State Context:**

-   External add/remove operations
-   Real-time list updates
-   Dynamic content

---

#### 5. **Notification/Toast Plugin**

Show transient notifications:

```typescript
// Fire-and-forget notifications
notify.info("File saved");
notify.error("Upload failed");
notify.success("Task completed");
```

**Why It Needs Plugin State Context:**

-   External trigger (from anywhere in code)
-   Multiple notifications
-   Auto-dismiss timers

---

### 🟡 Medium Value

#### 6. **Timer/Countdown Plugin**

Display countdown or elapsed time:

```typescript
await countdown({
    duration: 300, // 5 minutes
    label: "Time remaining",
});
```

**Could Use Plugin State Context:**

-   Timer ticks update external state
-   Real-time display
-   But could also use internal setInterval

---

#### 7. **Dynamic Form Plugin**

Form with fields that appear/disappear based on external conditions:

```typescript
await dynamicForm({
    fields: initialFields,
});

// Based on some condition
addField(formId, newField);
removeField(formId, oldFieldId);
```

**Would Benefit:**

-   External field manipulation
-   Conditional field display
-   Dynamic validation

---

## Pattern Recognition: When To Use Plugin State Context

Use Plugin State Context when your plugin has:

### ✅ Use It If:

1. **External/global state** - State lives outside the component (store, service, global variable)
2. **External updates** - State changes from code outside the component
3. **Shared state** - Multiple components or external code access the same state
4. **Dynamic content** - Content added/removed programmatically from outside
5. **Fire-and-forget APIs** - Trigger updates from anywhere (e.g., `tasks.add()`)

### ❌ Don't Use It If:

1. **Component-local state** - State lives inside component with `useState`
2. **Self-contained** - Component manages its own state without external updates
3. **Static content** - No updates needed
4. **One-time render** - Doesn't persist
5. **Tree-managed only** - Tree updates are sufficient (though you can use both)

## Migration Checklist

For any plugin that needs Plugin State Context:

```typescript
// 1. In your store/service
import { getPluginStateNotifier } from "../../core/plugin-state-context";

export function updateExternalState(data: any) {
    myGlobalState = data;

    const notifyChange = getPluginStateNotifier();
    if (notifyChange) {
        notifyChange();
    }
}

// 2. In your component
import { usePluginState } from "../../core/plugin-state-context";

export const MyPlugin = ({ node, options, events }) => {
    const { revision } = usePluginState();

    useEffect(() => {
        // Refresh state when revision changes
        setMyState(getMyExternalState());
    }, [revision]);

    return <Box>...</Box>;
};
```

## Recommendation Summary

### Completed Migrations

-   ✅ Tasks: Migrated (removed polling)
-   ✅ Completed Fields: Migrated (removed dead code)
-   ⬜ Others: No changes needed currently

### Future Plugins

Consider Plugin State Context for:

-   🔥 Progress monitors
-   🔥 Live data feeds
-   🔥 Status dashboards
-   🔥 Dynamic lists
-   🔥 Notifications

### Success!

Both major plugins now use Plugin State Context:

-   ✅ Tasks - Real-time dynamic task updates
-   ✅ Completed Fields - Clean code, future-ready

## Documentation for Plugin Authors

When creating a new plugin, ask:

**"Does this plugin's state live outside the component?"**

-   **Yes** (global store, service, external variable) → Use Plugin State Context
-   **No** (local `useState` in component) → Don't use it

**"Will this plugin's state be updated from outside the component?"**

-   **Yes** (e.g., `tasks.add()`, external API calls) → Use Plugin State Context
-   **No** (only internal events like user input) → Don't use it

## Example: Good vs Bad Use Cases

### ✅ Good Use Case

```typescript
// Progress that updates from external process
export function updateProgress(id, value) {
    progressStore.set(id, value); // External state
    getPluginStateNotifier()?.(); // Trigger update!
}

// Component
const { revision } = usePluginState();
useEffect(() => {
    setProgress(progressStore.get(id));
}, [revision]);
```

### ❌ Bad Use Case

```typescript
// Input field with component-local state
const [value, setValue] = useState("");

// User types -> setValue -> re-render
// State lives IN the component
// No external state, no Plugin State Context needed!
```

## Conclusion

**Current State:** Both major plugins (tasks and completedFields) now use Plugin State Context!

**Benefits:**

-   Consistent patterns across plugins
-   Clean, maintainable code
-   No polling or dead code
-   Future-ready for enhancements

**Future:** The system is ready for any plugin that needs external state updates, real-time displays, or dynamic content.

**The infrastructure is proven and working** - new plugins can adopt it as needed without any changes to the core system!
