# Renaming: Plugin State → Prompt State

## Summary

Renamed all "Plugin State" terminology to "Prompt State" for consistency with the library's focus on prompts.

## Changes

### Function Renames

| Old Name                   | New Name                   |
| -------------------------- | -------------------------- |
| `usePluginState()`         | `usePromptState()`         |
| `getPluginStateNotifier()` | `getPromptStateNotifier()` |
| `setPluginStateNotifier()` | `setPromptStateNotifier()` |
| `PluginStateProvider`      | `PromptStateProvider`      |
| `PluginStateContext`       | `PromptStateContext`       |

### Files Updated

#### Core System

-   ✅ `src/core/plugin-state-context.tsx` - All functions and types renamed
-   ✅ `src/core.ts` - Export names updated
-   ✅ `src/core/ui.tsx` - Uses `PromptStateProvider`
-   ✅ `src/components/PromptApp.tsx` - Uses `usePromptState` and `setPromptStateNotifier`

#### Prompts Using State Context

-   ✅ `src/built-ins/tasks/task-store.ts` - Uses `getPromptStateNotifier()`
-   ✅ `src/built-ins/tasks/Tasks.tsx` - Uses `usePromptState()`
-   ✅ `src/built-ins/completed-fields/completed-fields-store.ts` - Uses `getPromptStateNotifier()`
-   ✅ `src/built-ins/completed-fields/index.tsx` - Uses `usePromptState()`

#### Examples

-   ✅ `examples/custom-plugin-with-core-imports.tsx` - Uses new API names

#### Documentation

-   ✅ `src/built-ins/README.md` - All references updated to "prompt"

## New API

### Import

```typescript
import { usePromptState, getPromptStateNotifier } from "askeroo/core";
```

### Usage in Components

```typescript
const { revision } = usePromptState();
```

### Usage in Stores

```typescript
const notifyChange = getPromptStateNotifier();
if (notifyChange) {
    notifyChange();
}
```

## Consistency Achieved

### Before (Inconsistent)

-   Library: "Askeroo" (prompts)
-   Functions: "Plugin State" ❌
-   Comments: "plugins" and "prompts" mixed

### After (Consistent)

-   Library: "Askeroo" (prompts) ✅
-   Functions: "Prompt State" ✅
-   Comments: "prompts" throughout ✅

## Documentation Updates

All documentation now uses consistent terminology:

-   "Prompt State Context" (not Plugin State Context)
-   "For prompts that..." (not For plugins that...)
-   "Notify prompts to update" (not Notify plugins to update)
-   "Works for any prompt" (not Works for any plugin)

## Build Status

✅ **Build successful**

```bash
npm run build  # ✓ Success
```

All renames complete and working! 🎉

## Migration for External Users

If anyone was using the old names (unlikely since this just shipped), they would need to update:

```typescript
// Old
import { usePluginState, getPluginStateNotifier } from "askeroo/core";

// New
import { usePromptState, getPromptStateNotifier } from "askeroo/core";
```

Simple find-and-replace.
