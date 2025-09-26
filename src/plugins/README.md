# Plugin System

The plugin system allows you to create custom prompt types and register them with the runtime.

## Core Plugins

Core plugins are registered when you import them from the main package. They include:

- `text` - Text input fields
- `confirm` - Yes/no confirmation prompts
- `multi` - Multi-select prompts
- `note` - Display-only note prompts
- `completed-fields` - Display completed field values
- `radio` - Radio button selection prompts

## Creating Custom Plugins

### Method 1: Using `createPlugin` (Recommended)

The easiest way to create a plugin is using the `createPlugin` helper, which automatically registers your plugin when the module is imported:

```typescript
import React from 'react';
import { createPlugin } from '../registry.js';

// Your component
function MyCustomField({ label, onSubmit, ...props }) {
  return (
    <Text>{label}</Text>
    // Your custom UI logic here
  );
}

// Create and auto-register the plugin
export const myCustomField = createPlugin({
  type: 'my-custom-field',
  component: MyCustomField,
  interactive: true, // Optional: whether this requires user interaction
  prompt: (opts, context, id) => opts, // Process options if needed
});
```

Then use it in your code:

```typescript
import { ask } from '../core.js';
import { myCustomField } from './path/to/my-custom-field.js'; // Import registers the plugin automatically

const result = await ask(async ({ myCustomField }) => {
  return await myCustomField({
    label: "Enter something custom:",
    // any other options
  });
});
```

**Note:** Just importing the plugin file registers it with the runtime, just like built-in plugins work when you import them from the main package.

### Method 2: Manual Registration

For more control, you can manually register plugins:

```typescript
import { registerPlugin, globalRegistry } from '../registry.js';

// Define your plugin
const myPlugin = {
  type: 'my-plugin',
  component: MyComponent,
  interactive: true,
  prompt: (opts, context, id) => opts,
};

// Register it
registerPlugin(myPlugin);

// Or access the registry directly
globalRegistry.register(myPlugin);
```

## Plugin Structure

Each plugin must have:

- `type`: Unique string identifier for the plugin
- `component`: React component that renders the UI
- `prompt`: Function that processes options and returns them to the runtime
- `interactive`: (Optional) Boolean indicating if this requires user input

## Plugin Component Props

Your component will receive:

- All options passed to the plugin function
- `onSubmit`: Function to call when the user completes the prompt
- `onBack`: Function to call for back navigation (if enabled)
- `completed`: Boolean indicating if this field is in completed state
- `disabled`: Boolean indicating if this field should be disabled
- Plus other standard props like `flow`, `allowBack`, etc.

## Best Practices

1. **Self-register**: Import your plugin file to automatically register it
2. **Export the function**: Export the plugin function for use in flows
3. **Handle all states**: Support completed, disabled, and active states
4. **Follow conventions**: Use consistent prop names and behaviors
5. **Type safety**: Use TypeScript interfaces for better developer experience

## Example: Custom Slider Plugin

```typescript
import React, { useState } from 'react';
import { Text, useInput } from 'ink';
import { createPlugin } from '../registry.js';

interface SliderProps {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  onSubmit: (value: number) => void;
  // ... other standard props
}

function SliderField({ label, min = 0, max = 100, step = 1, onSubmit, ...props }: SliderProps) {
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

export const slider = createPlugin<SliderProps, number>({
  type: 'slider',
  component: SliderField,
  prompt: (opts) => opts,
});
```

This plugin would be used like:

```typescript
import './path/to/slider-plugin.js';

const volume = await slider({
  label: "Select volume level:",
  min: 0,
  max: 10,
  step: 1,
});
```