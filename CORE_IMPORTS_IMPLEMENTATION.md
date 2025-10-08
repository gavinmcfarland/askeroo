# Core Imports Implementation

## Summary

Created a clean `askeroo/core` export path for plugin development utilities, making it easier to create custom plugins.

## What Was Added

### New File: `src/core.ts`

Central export file that re-exports core utilities:

```typescript
// Plugin creation and registration
export {
    createPrompt,
    registerPlugin,
    globalRegistry,
    type PromptPlugin,
} from "./core/registry.js";

// Plugin State Context system for reactive updates
export {
    usePluginState,
    getPluginStateNotifier,
    PluginStateProvider,
    setPluginStateNotifier,
} from "./core/plugin-state-context.js";

// Runtime creation (advanced)
export { createRuntime } from "./core/core.js";

// Type definitions
export type { PluginComponentProps } from "./types/index.js";
```

### Package.json Updates

Updated export paths to match TypeScript compilation output:

```json
{
    "main": "./dist/src/index.js",
    "types": "./dist/src/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/src/index.d.ts",
            "import": "./dist/src/index.js"
        },
        "./core": {
            "types": "./dist/src/core.d.ts",
            "import": "./dist/src/core.js"
        }
    }
}
```

## Usage

### Before (Relative Paths)

```typescript
import { createPrompt } from "../../core/registry.js";
import {
    usePluginState,
    getPluginStateNotifier,
} from "../../core/plugin-state-context.js";
```

**Issues:**

-   Ugly relative paths
-   Different paths depending on file location
-   Hard to remember exact paths

### After (Clean Imports)

```typescript
import {
    createPrompt,
    usePluginState,
    getPluginStateNotifier,
} from "askeroo/core";
```

**Benefits:**

-   ✅ Clean, simple imports
-   ✅ Same import everywhere
-   ✅ Easy to remember
-   ✅ Professional API

## What's Exported

### Plugin Creation

```typescript
import { createPrompt } from "askeroo/core";

export const myPlugin = createPrompt({
    type: "my-plugin",
    component: MyComponent,
});
```

### Plugin State Context

```typescript
import { usePluginState, getPluginStateNotifier } from "askeroo/core";

// In component
const { revision } = usePluginState();

// In store
getPluginStateNotifier()?.();
```

### Manual Registration (Advanced)

```typescript
import { registerPlugin, globalRegistry } from "askeroo/core";

registerPlugin(myPlugin);
globalRegistry.getComponent("my-plugin");
```

### Types

```typescript
import { type PluginComponentProps, type PromptPlugin } from "askeroo/core";
```

## Documentation Updated

### src/built-ins/README.md

All examples now use `askeroo/core`:

-   ✅ Example 1: Tasks (External Updates)
-   ✅ Example 2: Completed Fields (Read External Data)
-   ✅ API Reference
-   ✅ Custom Slider Plugin example
-   ✅ Manual Registration example

### PLUGIN_STATE_CONTEXT_GUIDE.md

All examples updated to use:

-   ✅ `import { usePluginState } from "askeroo/core"`
-   ✅ `import { getPluginStateNotifier } from "askeroo/core"`

## Example Plugin

Created `examples/custom-plugin-with-core-imports.tsx` demonstrating:

-   Creating a plugin with `createPrompt` from `askeroo/core`
-   Using `usePluginState` for reactive updates
-   Using `getPluginStateNotifier` to trigger updates from external code

## Testing

### Build Status

✅ Success

```bash
npm run build
```

### Generated Files

-   ✅ `dist/src/core.js` - Compiled JavaScript
-   ✅ `dist/src/core.d.ts` - TypeScript definitions
-   ✅ Package exports configured correctly

### Import Test

```typescript
// Works in user code!
import {
    createPrompt,
    usePluginState,
    getPluginStateNotifier,
} from "askeroo/core";
```

## Benefits

### For Plugin Authors

**Before:**

```typescript
import { createPrompt } from "../../core/registry.js";
import { usePluginState } from "../../core/plugin-state-context.js";
import { getPluginStateNotifier } from "../../core/plugin-state-context.js";
```

**After:**

```typescript
import {
    createPrompt,
    usePluginState,
    getPluginStateNotifier,
} from "askeroo/core";
```

**Improvements:**

-   🎯 3 imports → 1 import
-   📦 No relative paths
-   💎 Clean, professional API
-   📖 Easy to document
-   🧠 Easy to remember

### For Documentation

-   Clear import paths in examples
-   Consistent across all docs
-   Works in both internal and external plugins

## Files Modified

### New Files

-   `src/core.ts` - Core export file
-   `examples/custom-plugin-with-core-imports.tsx` - Demo example

### Updated Files

-   `package.json` - Fixed export paths
-   `src/built-ins/README.md` - Updated all examples
-   `PLUGIN_STATE_CONTEXT_GUIDE.md` - Updated all examples

## Summary

Plugin authors can now import all core utilities from a single, clean path:

```typescript
import {
    createPrompt, // Create custom plugins
    usePluginState, // Subscribe to state updates
    getPluginStateNotifier, // Trigger state updates
    registerPlugin, // Manual registration
    globalRegistry, // Access registry
} from "askeroo/core";
```

This makes the API more professional and easier to use! 🎉
