# Plugin System

The plugin system uses **automatic registration** - plugins register themselves when imported. This allows you to:

-   Only import and bundle the plugins you actually use
-   Create custom plugins that work exactly like built-in ones
-   No need to manually register plugins or modify core files

## How It Works

When you import a plugin (either built-in or custom), it automatically registers itself with the global registry. The runtime then discovers and uses all registered plugins dynamically.

```typescript
// When you import plugins, they auto-register
import { ask, text, confirm } from "askeroo";

// Now they're available in your flow
const result = await ask(async () => {
    const name = await text({ label: "Name?" });
    const ok = await confirm({ label: "Continue?" });
    return { name, ok };
});
```

## Core Plugins

Built-in plugins that auto-register when imported:

-   `text` - Text input fields
-   `confirm` - Yes/no confirmation prompts
-   `multi` - Multi-select prompts
-   `note` - Display-only note prompts
-   `completed-fields` - Display completed field values
-   `radio` - Radio button selection prompts
-   `tasks` - Task list prompts
-   `group` - Group prompts into logical sections
-   `ask` - The main ask function with customizable root containers

## Creating Custom Plugins

### Using `createPrompt` (Recommended)

Use the `createPrompt` helper to create plugins that auto-register when imported:

```typescript
import { useState } from "react";
import { Text, useInput } from "ink";
import { createPrompt } from "askeroo/core";

interface MyOptions {
    label: string;
}

// Create and export your plugin - it auto-registers when imported
export const myCustomField = createPrompt<MyOptions, string>({
    type: "my-custom-field",
    component: ({ node, options, events }) => {
        const [value, setValue] = useState("");

        useInput(
            (input, key) => {
                if (key.return) {
                    events.onSubmit?.(value);
                } else if (input) {
                    setValue((prev) => prev + input);
                }
            },
            { isActive: node.state === "active" }
        );

        return (
            <Text>
                {options.label}: {value}
            </Text>
        );
    },
    autoSubmit: false, // Optional: auto-submit without user interaction
    transform: (opts) => opts, // Optional: transform options before rendering
});
```

Then use it in your code:

```typescript
import { ask } from "askeroo";
import { myCustomField } from "./my-custom-field.js";

// Just importing myCustomField registers it automatically!
const result = await ask(async () => {
    const value = await myCustomField({
        label: "Enter something custom",
    });
    return { value };
});
```

**Key Point:** The plugin registers itself when imported - no manual registration needed!

## Special Plugins

### Custom Ask Plugin

The `custom-ask` plugin allows you to create your own `ask()` function with a customizable root container. This is useful for adding branding, custom layouts, or conditional styling to your prompt flows.

```typescript
import { createCustomAsk } from "../plugins/custom-ask/index.js";

const result = await createCustomAsk(
    async ({ text, confirm }) => {
        const name = await text({ label: "Name" });
        const confirmed = await confirm({ label: "Confirm?" });
        return { name, confirmed };
    },
    {
        rootContainer: ({ children }) => (
            <Box flexDirection="column" borderStyle="double" padding={1}>
                <Text color="blue" bold>
                    🚀 My Custom App
                </Text>
                {children}
            </Box>
        ),
    }
);
```

See the [Custom Ask Plugin README](./custom-ask/README.md) for detailed documentation and examples.

### Manual Registration (Advanced)

For advanced use cases, you can manually register plugins:

```typescript
import { registerPlugin, globalRegistry } from "askeroo/core";

// Define your plugin
const myPlugin = {
    type: "my-plugin",
    component: MyComponent,
    autoSubmit: false,
};

// Register it manually
registerPlugin(myPlugin);

// Or access the registry directly
globalRegistry.register(myPlugin);
```

> **Note:** Manual registration is rarely needed. Use `createPrompt` for automatic registration.

## Plugin Structure

Each plugin must have:

-   `type`: Unique string identifier for the plugin
-   `component`: React component that renders the UI
-   `prompt`: Function that processes options and returns them to the runtime
-   `autoSubmit`: (Optional) Boolean indicating if this auto-submits without user input (default: false)

## Plugin Component Props

Your component will receive:

-   All options passed to the plugin function
-   `onSubmit`: Function to call when the user completes the prompt
-   `onBack`: Function to call for back navigation (if enabled)
-   `completed`: Boolean indicating if this field is in completed state
-   `disabled`: Boolean indicating if this field should be disabled
-   Plus other standard props like `flow`, `allowBack`, etc.

## Prompt State Context

For prompts that need to update state externally (stored outside the component), use the **Prompt State Context** system.

**✨ NEW: Automatic Caching** - `useExternalState` now handles caching automatically! Just return your data directly from your getter function - no need for manual caching, memoization, or cache invalidation. The system uses JSON comparison internally to only trigger re-renders when data actually changes, preventing infinite loops even when your getters return new instances (arrays, objects, Maps).

### When to Use It

Use Prompt State Context when your prompt has:

-   ✅ **External/global state** - State lives outside the component (in a store, service, or global variable)
-   ✅ **State updates from elsewhere** - State changes from outside the component (e.g., `tasks.add()`, `clearStore()`)
-   ✅ **Shared state** - Multiple instances or external code need to read/write the same state
-   ✅ **Dynamic content** - Content added/removed programmatically from outside the component

Don't use it for:

-   ❌ **Component-local state** - State lives inside the component with `useState` (like `text`, `confirm`)
-   ❌ **Self-contained inputs** - Component manages its own state without external updates

### Example 1: Tasks (External Updates)

For prompts that **add content dynamically**:

```typescript
import {
    createPrompt,
    useExternalState,
    notifyExternalStateChange,
} from "askeroo/core";

// Store
export function addDynamicTask(task: Task) {
    // Add to global store
    globalTaskStore.tasks.push(task);

    // Notify React to re-render (one line!)
    notifyExternalStateChange();
}

// Component
export const TasksDisplay = ({ node, options, events }) => {
    // Subscribe to updates and read data in one line!
    const tasks = useExternalState(() => getTasksFromStore());

    return <Box>...</Box>;
};
```

### Example 2: Completed Fields (Read External Data)

For prompts that **read from external sources**:

```typescript
import { createPrompt, useExternalState, notifyExternalStateChange } from "askeroo/core";

// PromptApp - Notify when tree changes (fields added/removed)
function handleFieldAction(action) {
    // Update tree
    treeManagerRef.current.updateNode(nodeId, { completed: true });

    // Notify both systems atomically
    flushSync(() => {
        setTreeRevision(prev => prev + 1);  // Tree consumers
        notifyExternalStateChange();          // Prompt consumers
    });
}

// Store - Notify when programmatic changes occur
export function clearCompletedFieldsStore() {
    // Clear data
    globalStore = { ... };

    // Notify prompts to update (one line!)
    notifyExternalStateChange();
}

// Component
export const completedFields = createPrompt({
    type: "completedFields",
    component: ({ node, options, events }) => {
        // Subscribe and read data in one line!
        const allFields = useExternalState(() => getCompletedFieldsData());
        const displayFields = options.maxFields
            ? allFields.slice(0, options.maxFields)
            : allFields;

        return (
            <Box flexDirection="column">
                {displayFields.map((field) => (
                    <Text key={field.id}>...</Text>
                ))}
            </Box>
        );
    },
});
```

**Note:** Both examples use the same pattern now! `useExternalState` works for all cases - no need to choose between different patterns.

### API Reference

```typescript
// In your prompt component
import { useExternalState } from "askeroo/core";

// Single line - reads data and auto-updates!
const data = useExternalState(() => getMyExternalData());
// ✅ Works even if getMyExternalData() returns new instances each time!

// In your store/service
import { notifyExternalStateChange } from "askeroo/core";

// Update state, then notify (one line!)
globalState.data = newData;
notifyExternalStateChange();
```

### How Automatic Caching Works

**No manual caching needed!** Here's what happens behind the scenes:

1. **Your getter returns data** - Can be a new array, object, Map, Set, etc. each time
2. **Smart serialization** - `useExternalState` handles Maps/Sets/arrays/objects correctly
3. **Content comparison** - Compares serialized content with the previous call
4. **Smart re-render** - Only triggers re-render if data content actually changed
5. **Stable instance** - Returns the same instance if content matches, preventing infinite loops

```typescript
// ✅ This works perfectly (no manual caching needed!)
const tasks = useExternalState(() => {
    return globalTaskStore.tasks; // Returns new array reference each time
});

// ✅ This also works (complex objects, nested data)
const fields = useExternalState(() => {
    const result = [];
    treeManager.traverseDepthFirst((node) => {
        if (node.completed) result.push({ ...node }); // New objects!
    });
    return result; // New array!
});

// ✅ Even Maps work (properly serialized for comparison)
const taskStates = useExternalState(() => {
    return allTaskStates.get(taskListId) || new Map(); // New Map each time!
});

// ✅ Sets also work
const activeIds = useExternalState(() => {
    return new Set(globalStore.activeIds); // New Set each time!
});
```

**Key Benefits:**

-   🚀 Write simple, direct getters without worrying about caching
-   🎯 No `useMemo`, `useRef`, or manual cache invalidation needed
-   ✨ Prevents infinite re-render loops automatically
-   📦 Works with arrays, objects, Maps, Sets, and nested structures
-   🗺️ Special handling for Map/Set serialization (proper content comparison)

**Benefits:**

-   ⚡ 0ms latency (instant updates)
-   🚀 Zero polling overhead
-   🎯 Atomic updates with `flushSync`
-   🔌 Works for any prompt
-   ✨ Single pattern for all cases
-   📦 Built on React's `useSyncExternalStore`

## Best Practices

1. **Use `createPrompt`**: It handles auto-registration and provides type safety
2. **Import only what you need**: Only import the plugins your app uses for optimal bundle size
3. **Handle all states**: Support `completed`, `disabled`, and `active` states in your component
4. **Type safety**: Define TypeScript interfaces for options and return types
5. **Export the function**: Export the result of `createPrompt` for use in flows
6. **Test in isolation**: Plugins can be tested independently since they're self-contained
7. **Use Prompt State Context**: For external state updates, use `useExternalState` and `notifyExternalStateChange`
8. **Just return data**: When using `useExternalState`, simply return your data - automatic caching prevents infinite loops!

## Example: Custom Slider Plugin

```typescript
import React, { useState } from "react";
import { Text, useInput } from "ink";
import { createPrompt } from "askeroo/core";

interface SliderProps {
    label: string;
    min?: number;
    max?: number;
    step?: number;
    onSubmit: (value: number) => void;
    // ... other standard props
}

function SliderField({
    label,
    min = 0,
    max = 100,
    step = 1,
    onSubmit,
    ...props
}: SliderProps) {
    const [value, setValue] = useState(min);

    useInput((input, key) => {
        if (key.leftArrow && value > min) {
            setValue(Math.max(min, value - step));
        }
        if (key.rightArrow && value < max) {
            setValue(Math.min(max, value + step));
        }
        if (key.return) {
            onSubmit(value);
        }
    });

    return (
        <>
            <Text>{label}</Text>
            <Text>Value: {value} (Use ← → to adjust, Enter to confirm)</Text>
        </>
    );
}

export const slider = createPrompt<SliderProps, number>({
    type: "slider",
    component: SliderField,
    prompt: (opts) => opts,
});
```

Use the slider plugin like this:

```typescript
import { ask } from "askeroo";
import { slider } from "./slider-plugin.js"; // Auto-registers when imported

const result = await ask(async () => {
    const volume = await slider({
        label: "Select volume level:",
        min: 0,
        max: 10,
        step: 1,
    });

    return { volume };
});
```

## Benefits of Auto-Registration

1. **Tree-shaking**: Unused plugins aren't bundled in your app
2. **No boilerplate**: No need to manually register each plugin
3. **Extensible**: Custom plugins work exactly like built-in ones
4. **Type-safe**: Full TypeScript support with inference
5. **Modular**: Plugins are self-contained and independent
