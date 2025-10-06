# Custom Ask Plugin

The Custom Ask plugin allows you to create your own `ask()` function with a customizable root container. This is useful when you want to customize the overall layout, styling, or add branding to your prompt flows.

## ✨ Usage

The `ask` function now includes built-in support for customizable root containers. It creates its own runtime context and can be used with or without custom containers.

**✅ Correct usage:**

```typescript
// Use as a standard ask function
const result = await ask(flow);

// Use with custom container
const result = await ask(flow, options);
```

## Features

-   **Custom Root Container**: Define your own root container component
-   **Container Props**: Pass custom props to your container component
-   **Helper Functions**: Convenient helper functions for common use cases
-   **Full Plugin Support**: Works with all existing plugins (text, confirm, multi, etc.)

## Basic Usage

### Method 1: Direct usage (Recommended)

```typescript
import React from "react";
import { Box, Text } from "ink";
import { ask } from "../src/index.js";

const result = await ask(
    async ({ text, confirm }) => {
        const name = await text({ label: "What's your name?" });
        const confirmed = await confirm({ label: "Is this correct?" });
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

### Method 2: Using the createAsk Factory

```typescript
import React from "react";
import { Box, Text } from "ink";
import { createAsk } from "../src/core/ask-factory.js";

// Create a custom ask function using the createAsk factory
const myCustomAsk = createAsk({
    type: "flow",
    component: ({ node, options }) => {
        const RootContainer =
            options.rootContainer || (({ children }) => children);
        return <RootContainer>{node.children}</RootContainer>;
    },
});

// Use it with custom container
const result = await myCustomAsk(
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

## Advanced Examples

### Styled Application Container

```typescript
const ask = createAskWithContainer(({ children }) => (
    <Box flexDirection="column" borderStyle="double" padding={1}>
        <Text color="blue" bold>
            🚀 My Custom Prompt Application
        </Text>
        <Text color="gray" dimColor>
            ─────────────────────────────
        </Text>
        {children}
        <Text color="gray" dimColor>
            ─────────────────────────────
        </Text>
    </Box>
));
```

### Professional Form Container

```typescript
const ask = createAskWithContainer(({ children }) => (
    <Box flexDirection="column" margin={1}>
        <Text color="green" bold>
            📋 User Information Form
        </Text>
        <Box marginTop={1} flexDirection="column">
            {children}
        </Box>
    </Box>
));
```

### Conditional Container

```typescript
const ask = createAskWithContainer(({ children }) => {
    const isDev = process.env.NODE_ENV === "development";

    return (
        <Box flexDirection="column">
            {isDev && (
                <Text color="yellow" dimColor>
                    [DEV MODE]
                </Text>
            )}
            {children}
        </Box>
    );
});
```

### Minimal Indented Container

```typescript
const ask = createAskWithContainer(({ children }) => (
    <Box flexDirection="column" paddingLeft={2}>
        {children}
    </Box>
));
```

## API Reference

### `ask(flow, options?)`

The main ask function with built-in support for customizable root containers. Creates its own runtime context.

**Parameters:**

-   `flow`: The flow function to execute (FlowFunction<T>)
-   `options`: Optional configuration object

**Options:**

-   `rootContainer`: React component for the root container
-   `rootContainerProps`: Additional props for the container

### `createAsk(config)`

Factory function for creating custom ask functions with custom configurations. Similar to `createPlugin` but creates standalone functions.

**Parameters:**

-   `config`: Configuration object with the same structure as `createPlugin`

**Returns:** A function that accepts a flow and options, and returns a promise

## Integration with Other Plugins

The custom ask plugin works seamlessly with all existing plugins:

```typescript
const ask = createAskWithContainer(MyContainer);

const result = await ask(
    async ({ text, confirm, multi, radio, note, group }) => {
        // Use any combination of plugins
        const name = await text({ label: "Name" });

        const userInfo = await group(
            async () => {
                const email = await text({ label: "Email" });
                const age = await text({ label: "Age" });
                return { email, age };
            },
            { label: "User Details" }
        );

        const skills = await multi({
            label: "Skills:",
            options: [
                { value: "js", label: "JavaScript" },
                { value: "ts", label: "TypeScript" },
            ],
        });

        return { name, userInfo, skills };
    }
);
```

## Tips and Best Practices

1. **Keep containers simple**: Focus on layout and branding, not complex logic
2. **Use consistent styling**: Apply your brand colors and styling consistently
3. **Consider accessibility**: Ensure your containers don't interfere with navigation
4. **Test with different plugins**: Make sure your container works with all plugin types
5. **Use conditional rendering**: Show different content based on environment or context

## Example Files

See `examples/custom-ask.ts` for comprehensive usage examples.
