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
import { createPrompt } from "askeroo";

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
import { registerPlugin, globalRegistry } from "askeroo";

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

## Best Practices

1. **Use `createPrompt`**: It handles auto-registration and provides type safety
2. **Import only what you need**: Only import the plugins your app uses for optimal bundle size
3. **Handle all states**: Support `completed`, `disabled`, and `active` states in your component
4. **Type safety**: Define TypeScript interfaces for options and return types
5. **Export the function**: Export the result of `createPrompt` for use in flows
6. **Test in isolation**: Plugins can be tested independently since they're self-contained

## Example: Custom Slider Plugin

```typescript
import React, { useState } from "react";
import { Text, useInput } from "ink";
import { createPrompt } from "../registry.js";

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
