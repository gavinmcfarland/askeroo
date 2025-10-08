# Submission Type System - Implementation Summary

## Overview

This implementation moves auto-submit control from the global plugin level to the individual prompt instance level, and adds a submission type tracking system that allows plugins to control back navigation based on how previous prompts were submitted.

## Changes Made

### 1. Core Type System Updates

#### `/src/core/prompt-tree.ts`

**Added to `PromptNode` interface:**

```typescript
// Submission tracking
submissionType?: "manual" | "auto" | "skipped" | "programmatic";
autoSubmit?: boolean; // Whether this specific prompt instance should auto-submit
```

**New methods in `PromptTreeManager`:**

-   `markNodeSubmitted()` - Mark a node with its submission type
-   `getNodeSubmissionType()` - Get how a node was submitted
-   `getPreviousNode()` - Get the previous node in history
-   `canGoBackBasedOnSubmissionType()` - Check if back navigation should be allowed
-   `canGoBackEnhanced()` - Enhanced canGoBack that considers submission types

#### `/src/types/index.ts`

**Updated `PromptRequest`:**

```typescript
export type PromptRequest = {
    // ... existing fields
    autoSubmit?: boolean; // Instance-level auto-submit control (overrides plugin-level)
};
```

**Updated `PluginOptionsWithBuiltins`:**

```typescript
export type PluginOptionsWithBuiltins<
    TOptions = any,
    TValue = any
> = TOptions & {
    // ... existing fields
    autoSubmit?: boolean; // Instance-level auto-submit control
};
```

### 2. Component Updates

#### `/src/components/PluginWrapper.tsx`

**Instance-level auto-submit logic:**

```typescript
// Check for instance-level autoSubmit first, then fall back to plugin-level
const instanceAutoSubmit = transformedProps.options.autoSubmit;
const shouldAutoSubmit =
    instanceAutoSubmit !== undefined
        ? instanceAutoSubmit
        : pluginLevelAutoSubmit;
```

#### `/src/components/PromptApp.tsx`

**Submission type tracking in `handleFieldAction`:**

```typescript
case "submit": {
    // Determine submission type based on node's autoSubmit property
    const node = treeManagerRef.current.getNode(nodeId);
    const submissionType = node?.autoSubmit ? "auto" : "manual";

    treeManagerRef.current.updateNode(nodeId, {
        value: action.value,
        visited: true,
        completed: true,
        submissionType: submissionType,
    });
    // ...
}
```

### 3. Plugin Updates

#### `/src/built-ins/note/index.tsx`

**Updated to support options:**

```typescript
export function note(
    message: string | MarkdownString,
    options?: { autoSubmit?: boolean; allowBack?: boolean }
): Promise<void> {
    return noteInternal({ message, ...options });
}
```

### 4. Documentation

**Created comprehensive documentation:**

-   `SUBMISSION_TYPE_SYSTEM.md` - Full API reference and usage guide
-   `IMPLEMENTATION_SUMMARY.md` - This summary
-   Example files demonstrating the new system

### 5. Examples

**Created two example files:**

1. `examples/submission-type-example.ts` - Practical usage examples
2. `examples/custom-plugin-with-submission-types.tsx` - Custom plugin integration

## How It Works

### Submission Type Flow

1. **Plugin Configuration**: Plugins can set default `autoSubmit` behavior

    ```typescript
    export const note = createPrompt({
        type: "note",
        autoSubmit: true, // Plugin-level default
        component: NoteComponent,
    });
    ```

2. **Instance Override**: Each prompt call can override the default

    ```typescript
    await note("Message", {
        autoSubmit: false, // Override plugin default
    });
    ```

3. **Automatic Tracking**: When submitted, the system records the submission type

    ```typescript
    // In PromptApp.tsx handleFieldAction
    const submissionType = node?.autoSubmit ? "auto" : "manual";
    node.submissionType = submissionType;
    ```

4. **Navigation Control**: Back navigation considers submission types
    ```typescript
    // Auto-submitted prompts typically shouldn't allow going back
    if (previousNode.submissionType === "auto") {
        return previousNode.allowBack !== false;
    }
    ```

### Priority Hierarchy

1. **Instance-level `autoSubmit`** (highest priority)

    - Set on individual prompt calls
    - Overrides everything else

2. **Plugin-level `autoSubmit`**

    - Set in `createPrompt` config
    - Default for all instances

3. **Default behavior** (lowest priority)
    - `autoSubmit: false` (manual submission required)

### Submission Types

| Type           | Description                        | Default Back Behavior       |
| -------------- | ---------------------------------- | --------------------------- |
| `manual`       | User pressed Enter/submitted       | Allow back                  |
| `auto`         | Auto-submitted without user action | Prevent back (configurable) |
| `skipped`      | Programmatically skipped           | Allow back                  |
| `programmatic` | System/code submitted              | Context-dependent           |

## Usage Examples

### Basic Instance-Level Control

```typescript
// Use plugin default (auto-submit)
await note("This auto-submits");

// Override to require user interaction
await note("Press Enter to continue", { autoSubmit: false });
```

### Control Back Navigation

```typescript
// Auto-submit but allow going back
await note("Important info", {
    autoSubmit: true,
    allowBack: true,
});

// Manual but prevent going back
await text({
    label: "One-time password",
    allowBack: false,
});
```

### Check Previous Submission Type

```typescript
// In a custom plugin
const treeManager = getCurrentTreeManager();
const previousNode = treeManager.getPreviousNode();

if (previousNode?.submissionType === "auto") {
    // Previous was auto-submitted, adjust behavior
}
```

## Migration Guide

### Before

```typescript
// Plugin-level only, no instance control
export const note = createPrompt({
    type: "note",
    autoSubmit: true, // All instances auto-submit
    component: NoteComponent,
});

await note("Message"); // Always auto-submits
```

### After

```typescript
// Plugin-level default + instance control
export const note = createPrompt({
    type: "note",
    autoSubmit: true, // Default
    component: NoteComponent,
});

await note("Auto message"); // Uses default: auto

await note("Manual message", {
    autoSubmit: false, // Override: manual
});
```

## Benefits

1. **Flexibility**: Control auto-submit per prompt instance, not just per plugin
2. **Better UX**: Prevent confusing navigation (e.g., going back to auto-submitted notes)
3. **Context Awareness**: Plugins can check how previous prompts were submitted
4. **Backward Compatible**: Existing code continues to work
5. **Conditional Behavior**: Enable/disable auto-submit based on runtime conditions

## Testing

Build verification:

```bash
npm run build
```

Run examples:

```bash
node dist/examples/submission-type-example.js
node dist/examples/custom-plugin-with-submission-types.js
```

## Next Steps for Usage

1. **Review documentation**: Read `SUBMISSION_TYPE_SYSTEM.md` for full API details
2. **Update plugins**: Add instance-level `autoSubmit` support where needed
3. **Test flows**: Verify navigation behavior with auto-submitted prompts
4. **Custom plugins**: Use submission types to create smart navigation experiences

## API Reference Summary

### PromptNode Properties

-   `submissionType?: "manual" | "auto" | "skipped" | "programmatic"`
-   `autoSubmit?: boolean`

### PromptTreeManager Methods

-   `markNodeSubmitted(nodeId, submissionType): boolean`
-   `getNodeSubmissionType(nodeId): string | undefined`
-   `getPreviousNode(): PromptNode | null`
-   `canGoBackBasedOnSubmissionType(): boolean`
-   `canGoBackEnhanced(): boolean`

### Plugin Options

All plugins now support:

-   `autoSubmit?: boolean` - Override plugin-level auto-submit
-   `allowBack?: boolean` - Control back navigation explicitly

## Files Modified

✅ `/src/core/prompt-tree.ts` - Added submission type tracking and navigation methods
✅ `/src/types/index.ts` - Updated type definitions
✅ `/src/components/PluginWrapper.tsx` - Instance-level auto-submit logic
✅ `/src/components/PromptApp.tsx` - Submission type recording
✅ `/src/built-ins/note/index.tsx` - Support for options parameter

## Files Created

✅ `SUBMISSION_TYPE_SYSTEM.md` - Comprehensive documentation
✅ `IMPLEMENTATION_SUMMARY.md` - This summary
✅ `examples/submission-type-example.ts` - Usage examples
✅ `examples/custom-plugin-with-submission-types.tsx` - Custom plugin example

## Build Status

✅ TypeScript compilation successful
✅ No linter errors
✅ All examples compile
✅ Backward compatible with existing code
