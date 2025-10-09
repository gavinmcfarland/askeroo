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

### Two Approaches

There are two ways to manage external state in prompts:

1. **Store Factory Pattern (Recommended)** - Simple, ergonomic API with `createStore`
2. **Manual API** - Lower-level control with `useExternalState` + `notifyExternalStateChange`

## Store Factory Pattern (Recommended)

The store factory pattern provides the simplest API for managing external state. It automatically handles notifications and provides a clean interface.

### Quick Example

```typescript
import { createPrompt, createStore } from "askeroo/core";

// 1. Create a typed store (one line!)
export const taskStore = createStore({
  tasks: [] as Task[],
  activeTaskId: null as string | null,
});

// 2. Update anywhere - notifications are automatic!
export function addTask(task: Task) {
  taskStore.update(state => {
    state.tasks.push(task);
  });
  // No manual notify call needed! ✨
}

// 3. Use in components - clean and simple
export const TasksDisplay = ({ node, options, events }) => {
  const { tasks, activeTaskId } = taskStore.use();
  // Automatically subscribes and re-renders on changes!

  return <Box>{tasks.map(...)}</Box>;
};
```

### Store API Reference

```typescript
const store = createStore(initialState);

// Get current state (doesn't subscribe)
const state = store.get();

// Update state with a function (auto-notifies)
store.update((state) => {
    state.tasks.push(newTask);
});

// Set state directly (auto-notifies)
store.set({ tasks: [], activeTaskId: null });

// Use in React components (auto-subscribes)
const state = store.use();

// Subscribe manually (advanced)
const unsubscribe = store.subscribe(() => {
    console.log("State changed!", store.get());
});

// Reset to initial state
store.reset();
```

### Advanced: Multiple Stores

You can compose multiple stores for complex state:

```typescript
export const taskListStore = createStore({
    lists: new Map<string, TaskList>(),
});

export const taskStore = createStore({
    tasks: new Map<string, Task>(),
});

// Cross-store operations
export function deleteTaskList(listId: string) {
    // Update multiple stores in one operation
    taskListStore.update((state) => {
        state.lists.delete(listId);
    });

    taskStore.update((state) => {
        // Remove all tasks in this list
        for (const [id, task] of state.tasks) {
            if (task.listId === listId) {
                state.tasks.delete(id);
            }
        }
    });
}
```

### Advanced: Computed Values

```typescript
import { useMemo } from "react";

export const taskStore = createStore({
  tasks: [] as Task[],
  filter: 'all' as 'all' | 'active' | 'completed',
});

// Memoized selector in component
export const TasksDisplay = ({ node, options, events }) => {
  const { tasks, filter } = taskStore.use();

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  return <Box>{filteredTasks.map(...)}</Box>;
};
```

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
