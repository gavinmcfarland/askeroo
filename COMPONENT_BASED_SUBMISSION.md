# Component-Based Submission System

## Overview

The submission type system has been refactored to move auto-submit logic **from configuration options into component code**. This provides more flexibility and makes the submission behavior explicit and controllable within each plugin.

## Key Changes

### Before: Configuration-Based

```typescript
// OLD APPROACH - Configuration
export const note = createPrompt({
    type: "note",
    autoSubmit: true, // ❌ Global configuration
    component: NoteComponent,
});

// Usage required autoSubmit option
await note("Message", { autoSubmit: false }); // Override at instance level
```

### After: Component-Based

```typescript
// NEW APPROACH - Component logic
export const note = createPrompt({
    type: "note",
    component: ({ node, options, events }) => {
        // ✅ Auto-submit logic embedded in component
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                const timer = setTimeout(() => {
                    events.onSubmit("__auto"); // Special value indicates type
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit]);

        return <Box>{/* content */}</Box>;
    },
});

// Usage is simpler
await note("Message"); // Auto-submits based on component logic
```

## How It Works

### 1. Consistent Submission Format

Components indicate submission type using a consistent object format:

| Submit Value                         | Submission Type  | Result Value |
| ------------------------------------ | ---------------- | ------------ |
| `{ type: "auto" }`                   | `"auto"`         | `undefined`  |
| `{ type: "auto", value: X }`         | `"auto"`         | `X`          |
| `{ type: "skip" }`                   | `"skipped"`      | `undefined`  |
| `{ type: "programmatic", value: X }` | `"programmatic"` | `X`          |
| Any other value                      | `"manual"`       | That value   |

### 2. Detection in PromptApp

The `handleFieldAction` function in `PromptApp.tsx` detects the submission format:

```typescript
case "submit": {
    let submissionType: "manual" | "auto" | "skipped" | "programmatic" = "manual";
    let actualValue = action.value;

    if (
        typeof action.value === "object" &&
        action.value !== null &&
        "type" in action.value
    ) {
        // Consistent format: { type: "auto", value?: any }
        submissionType = action.value.type;
        actualValue = action.value.value;
    } else {
        // Regular value = manual submission
        submissionType = "manual";
        actualValue = action.value;
    }

    // Store submission type on the node
    treeManagerRef.current.updateNode(nodeId, {
        value: actualValue,
        submissionType: submissionType,
        completed: true,
    });
}
```

### 3. Navigation Control

Back navigation automatically considers submission types:

```typescript
// In PromptTreeManager
canGoBackBasedOnSubmissionType(): boolean {
    const previousNode = this.getPreviousNode();
    if (!previousNode) return false;

    // Auto-submitted prompts can't be navigated back to
    if (previousNode.submissionType === "auto") {
        return previousNode.allowBack !== false;
    }

    return previousNode.allowBack !== false;
}
```

## Implementation Examples

### Basic Auto-Submit (Display Only)

```typescript
export const note = createPrompt<NoteOptions, void>({
    type: "note",
    component: ({ node, options, events }) => {
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                const timer = setTimeout(() => {
                    events.onSubmit({ type: "auto" });
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit]);

        return <Box>{parseMarkdown(options.message)}</Box>;
    },
});
```

### Conditional Auto-Submit

```typescript
export const smartPrompt = createPrompt({
    type: "smartPrompt",
    component: ({ node, options, events }) => {
        const [shouldAuto] = useState(options.autoMode ?? false);

        useEffect(() => {
            if (node.state === "active" && events.onSubmit && shouldAuto) {
                const timer = setTimeout(() => {
                    events.onSubmit({ type: "auto" });
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit, shouldAuto]);

        // If not auto, handle manual submission
        useInput(
            (input, key) => {
                if (!shouldAuto && key.return) {
                    events.onSubmit(value);
                }
            },
            { isActive: node.state === "active" }
        );

        return <YourComponent />;
    },
});
```

### Auto-Submit with Computed Value

```typescript
export const asyncLoader = createPrompt({
    type: "asyncLoader",
    component: ({ node, options, events }) => {
        const [data, setData] = useState(null);

        useEffect(() => {
            async function load() {
                const result = await fetchData(options.url);
                setData(result);
            }
            load();
        }, [options.url]);

        useEffect(() => {
            if (node.state === "active" && events.onSubmit && data) {
                // Auto-submit with the loaded data
                events.onSubmit({
                    type: "auto",
                    value: data,
                });
            }
        }, [node.state, events.onSubmit, data]);

        return <Text>Loading: {data ? "Done" : "..."}</Text>;
    },
});
```

### Manual with Skip Option

```typescript
export const skipablePrompt = createPrompt({
    type: "skipablePrompt",
    component: ({ node, options, events }) => {
        useInput(
            (input, key) => {
                if (key.escape) {
                    // Skip submission
                    events.onSubmit({ type: "skip" });
                } else if (key.return) {
                    // Manual submission
                    events.onSubmit(value);
                }
            },
            { isActive: node.state === "active" }
        );

        return <YourComponent />;
    },
});
```

## Updated Built-in Plugins

### note

```typescript
// Auto-submits with no value
useEffect(() => {
    if (node.state === "active" && events.onSubmit) {
        const timer = setTimeout(() => events.onSubmit({ type: "auto" }), 10);
        return () => clearTimeout(timer);
    }
}, [node.state, events.onSubmit]);
```

### completedFields

```typescript
// Auto-submits after rendering completed fields
useEffect(() => {
    if (node.state === "active" && events.onSubmit) {
        const timer = setTimeout(() => events.onSubmit({ type: "auto" }), 10);
        return () => clearTimeout(timer);
    }
}, [node.state, events.onSubmit]);
```

### group

Groups are handled differently - they auto-resolve in `PromptApp` without explicit submission.

## Benefits

1. **Clearer Intent**: Auto-submit logic is visible in the component code
2. **More Control**: Components can conditionally auto-submit based on state
3. **Flexibility**: Can compute values before auto-submitting
4. **Simpler API**: No need for `autoSubmit` option in every call
5. **Type Safety**: Submission types are automatically tracked
6. **Better Testing**: Auto-submit logic can be tested within component tests
7. **Smart Navigation**: `node.allowBack` automatically considers submission types

## Migration Guide

### For Plugin Authors

**Before:**

```typescript
export const myPlugin = createPrompt({
    type: "myPlugin",
    autoSubmit: true, // Remove this
    component: MyComponent,
});
```

**After:**

```typescript
export const myPlugin = createPrompt({
    type: "myPlugin",
    component: ({ node, options, events }) => {
        // Add auto-submit logic here
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                const timer = setTimeout(() => {
                    events.onSubmit("__auto");
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit]);

        return <MyComponent {...props} />;
    },
});
```

### For Users

**Before:**

```typescript
// Had to pass autoSubmit option
await note("Message", { autoSubmit: false });
```

**After:**

```typescript
// Auto-submit is built into the component
await note("Message");

// Only navigation control options are needed
await note("Message", { allowBack: false });
```

## Files Modified

-   `src/components/PromptApp.tsx` - Added detection of special submission values
-   `src/components/PluginWrapper.tsx` - Removed `autoSubmit` checking logic
-   `src/built-ins/note/index.tsx` - Embedded auto-submit in component
-   `src/built-ins/completed-fields/index.tsx` - Embedded auto-submit in component
-   `src/built-ins/group/index.tsx` - Removed `autoSubmit` flag (handled by PromptApp)

## Architecture Benefits

1. **Single Responsibility**: Each component controls its own submission behavior
2. **Encapsulation**: Submission logic is encapsulated within the component
3. **Composability**: Easy to create plugins that conditionally auto-submit
4. **Debuggability**: Auto-submit logic is visible in component code
5. **Testability**: Can test submission behavior at the component level
6. **Computed Props**: `node.allowBack` automatically reflects navigation constraints

### Computed node.allowBack

The `node.allowBack` prop passed to plugin components is automatically computed based on:

1. **Explicit Setting**: If user sets `allowBack: false`, it's honored
2. **First Prompt Check**: First interactive prompt can't go back
3. **Submission Type**: Previous auto-submitted prompts prevent back navigation

This means plugin developers can simply check `node.allowBack` without querying the tree manager:

```typescript
component: ({ node, options, events }) => {
    // node.allowBack is already computed considering all factors
    if (!node.allowBack) {
        // Hide back navigation hints
    }

    return <YourComponent />;
};
```

## Best Practices

1. **Use ~10ms delay**: Allows rendering before submission

    ```typescript
    setTimeout(() => events.onSubmit("__auto"), 10);
    ```

2. **Clean up timers**: Always return cleanup function

    ```typescript
    const timer = setTimeout(() => events.onSubmit("__auto"), 10);
    return () => clearTimeout(timer);
    ```

3. **Check node state**: Only auto-submit when active

    ```typescript
    if (node.state === "active" && events.onSubmit) {
        // Auto-submit logic
    }
    ```

4. **Use dependency array**: Include all dependencies in useEffect

    ```typescript
    useEffect(() => {
        // Logic
    }, [node.state, events.onSubmit]);
    ```

5. **Document behavior**: Comment why auto-submit is used
    ```typescript
    // Auto-submit after display - this is just informational
    useEffect(() => {
        // ...
    }, []);
    ```

## Summary

The component-based submission system provides:

-   ✅ Explicit control over submission behavior
-   ✅ Cleaner API without configuration options
-   ✅ Flexible conditional auto-submission
-   ✅ Better encapsulation and testability
-   ✅ Type-safe submission tracking
-   ✅ Smart navigation based on submission context

This approach makes the codebase more maintainable and gives plugin authors full control over when and how their components submit.
