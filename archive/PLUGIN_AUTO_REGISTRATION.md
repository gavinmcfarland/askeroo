# Plugin Auto-Registration Architecture

## Summary of Changes

The plugin system has been refactored to use **automatic registration** instead of hard-coded imports. This provides a more flexible, maintainable, and tree-shakeable architecture.

## What Changed

### 1. Removed Hard-Coded Plugin Imports

**File:** `src/core/runtime-factory.ts`

**Before:**

```typescript
// Import all plugins to ensure they're registered
import "../plugins/text/index.js";
import "../plugins/confirm/index.js";
import "../plugins/multi/index.js";
import "../plugins/note/index.js";
import "../plugins/radio/index.js";
import "../plugins/tasks/index.js";
import "../plugins/completed-fields/index.js";
import "../plugins/group/index.js";
import "../plugins/ask/index.js";
```

**After:**

```typescript
// No hard-coded imports - plugins auto-register when imported by users
```

### 2. Updated Documentation

-   **README.md** - Updated "Create Custom Prompts" section to emphasize auto-registration
-   **src/plugins/README.md** - Comprehensive rewrite explaining the auto-registration architecture

## How It Works

### Plugin Registration Flow

1. **Plugin Definition** - A plugin is created using `createPrompt`:

    ```typescript
    export const text = createPrompt<TextOptions, string>({
        type: "text",
        component: TextComponent,
    });
    ```

2. **Automatic Registration** - When the plugin module is imported, `createPrompt` executes and registers the plugin in the global registry:

    ```typescript
    // Inside createPrompt (registry.ts)
    globalRegistry.register(plugin);
    ```

3. **User Import** - Users import only the plugins they need:

    ```typescript
    import { ask, text, confirm } from "askeroo";
    ```

4. **Runtime Discovery** - When the runtime is created, it discovers all registered plugins:

    ```typescript
    // Inside PromptRuntime constructor
    this.initializePluginPrompts();

    // Inside initializePluginPrompts()
    for (const plugin of globalRegistry.getAll()) {
        // Create dynamic prompt functions
    }
    ```

### Code Flow Diagram

```
User Code:
  import { ask, text } from "askeroo"
       ↓
Main Export (index.ts):
  export { text } from "./plugins/text/index.js"
       ↓
Plugin Definition (plugins/text/index.tsx):
  export const text = createPrompt({ ... })
       ↓
Registry (core/registry.ts):
  globalRegistry.register(plugin)  ← AUTO-REGISTRATION
       ↓
User Code:
  const result = await ask(async () => {
      return await text({ label: "Name?" });
  })
       ↓
Runtime Creation (core/runtime-factory.ts):
  RuntimeFactory.createRuntime(ui)
       ↓
Plugin Discovery (core/prompt-runtime.ts):
  initializePluginPrompts()
  for (const plugin of globalRegistry.getAll())
       ↓
Plugin Available in Flow!
```

## Benefits

### 1. Tree-Shaking

Only imported plugins are bundled in the final application:

```typescript
// Only text and confirm are bundled
import { ask, text, confirm } from "askeroo";
```

### 2. No Boilerplate

Plugins work immediately when imported - no manual registration needed:

```typescript
// Just import and use
import { customField } from "./custom-field.js";
const result = await customField({ label: "Name" });
```

### 3. Extensibility

Custom plugins work exactly like built-in ones:

```typescript
// Create a custom plugin
export const slider = createPrompt({
    type: "slider",
    component: SliderComponent,
});

// Use it just like built-in plugins
import { slider } from "./slider.js";
```

### 4. Type Safety

Full TypeScript support with inference:

```typescript
export const text = createPrompt<TextOptions, string>({ ... });
// TypeScript knows text() returns Promise<string>
```

### 5. Modularity

Plugins are self-contained and independent - no coupling to core files.

## Custom Plugin Development

### Creating a Custom Plugin

```typescript
// my-plugin.ts
import { createPrompt } from "askeroo";
import { Text } from "ink";

export const myPlugin = createPrompt<MyOptions, string>({
    type: "my-plugin",
    component: ({ node, options, events }) => {
        // Your component implementation
        return <Text>{options.label}</Text>;
    },
});
```

### Using the Custom Plugin

```typescript
// app.ts
import { ask } from "askeroo";
import { myPlugin } from "./my-plugin.js"; // Auto-registers!

const result = await ask(async () => {
    const value = await myPlugin({ label: "Enter something" });
    return { value };
});
```

## Migration Guide

If you had custom plugins with manual registration:

### Before

```typescript
import { registerPlugin } from "askeroo";

const myPlugin = { ... };
registerPlugin(myPlugin);
```

### After

```typescript
import { createPrompt } from "askeroo";

export const myPlugin = createPrompt({ ... });
// Auto-registers when imported!
```

## Technical Details

### Global Registry

-   Location: `src/core/registry.ts`
-   Type: Singleton (`globalRegistry`)
-   Methods: `register()`, `get()`, `getAll()`

### Plugin Discovery

-   Location: `src/core/prompt-runtime.ts`
-   Method: `initializePluginPrompts()`
-   Timing: During runtime construction
-   Behavior: Creates dynamic prompt functions for all registered plugins

### Runtime Creation

-   Entry Point: `createAsk()` → `createRuntime()` → `RuntimeFactory.createRuntime()`
-   No forced imports - uses whatever plugins are registered at runtime creation time

## Testing

The architecture has been verified to work correctly:

1. ✅ Build succeeds with no errors
2. ✅ No linter errors
3. ✅ Plugins register when imported
4. ✅ Runtime discovers registered plugins dynamically
5. ✅ Custom plugins work like built-in ones

## Conclusion

The plugin system now follows a **self-registration pattern** that provides:

-   Better developer experience
-   Optimal bundle sizes through tree-shaking
-   Extensibility without modifying core files
-   Type safety and IDE support

Users can create custom plugins that work exactly like built-in ones, with no extra configuration required.
