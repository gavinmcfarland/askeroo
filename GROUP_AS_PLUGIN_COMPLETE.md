# Group Plugin - Full Extraction Complete ✅

## Overview

The `group` function has been successfully extracted as a **full-fledged container plugin** with proper architectural support. This required significant changes to the plugin architecture to support container/structural plugins that can hold other prompts.

## What Changed

### 1. Plugin Architecture Extended

**New plugin capabilities** (`src/types/index.ts`):

-   `isContainer`: Boolean flag marking plugins as containers
-   `execute`: Custom execution logic for containers
-   `onEnter`: Hook called when entering a container
-   `onExit`: Hook called when exiting a container

```typescript
export type PromptPlugin = {
    type: string;
    component?: React.ComponentType<any>;
    interactive?: boolean;
    // New container support:
    isContainer?: boolean;
    execute?: (
        runtime: any,
        opts: any,
        body?: () => Promise<any>
    ) => Promise<any>;
    onEnter?: (runtime: any, opts: any) => Promise<void> | void;
    onExit?: (runtime: any, opts: any) => Promise<void> | void;
};
```

### 2. Group Plugin Created

**Location**: `src/plugins/group/index.tsx`

The group plugin is now a proper container plugin with:

-   ✅ Plugin registration via `createPlugin()`
-   ✅ `GroupContainer` component for rendering
-   ✅ Custom `execute` hook that calls `runtime.executeGroupBody()`
-   ✅ Full support for all group features (progressive, phased, static)
-   ✅ Backward-compatible function signatures

```typescript
const groupPlugin = createPlugin<GroupOptions, any>({
    type: "group",
    component: GroupContainer,
    interactive: false,
    isContainer: true,
    execute: async (runtime, opts, body) => {
        return await runtime.executeGroupBody(opts, body);
    },
});
```

### 3. Runtime Updated

**New method**: `executeGroupBody(opts, body)`

-   Entry point for the group plugin's execute hook
-   Bridges plugin options to internal group logic
-   Maintains all existing group functionality

**Removed**: Direct `group` method from flow API

-   `group` is now accessed through the plugin system like any other prompt
-   Flow API simplified to just `BACK` + plugin prompts

### 4. Registry Enhanced

**New capabilities**:

-   `isContainer(type)`: Check if a plugin is a container
-   Support for plugins with `execute` function instead of component
-   Container plugins can call custom logic before delegating to runtime

### 5. Type System Updated

**FlowFunction simplified**:

```typescript
// Before:
type FlowFunction<T> = (api: { group: Function; BACK: BackToken; ... }) => Promise<T>;

// After:
type FlowFunction<T> = (api: { BACK: BackToken; [key: string]: any }) => Promise<T>;
```

All plugins (including `group`) are now dynamically added to the API via `...this.pluginPrompts`.

## Architecture Flow

### Group Execution Flow

```
User calls group(...)
  ↓
Plugin function called (from createPlugin return)
  ↓
Plugin detects isContainer + execute
  ↓
Calls execute(runtime, opts, body)
  ↓
execute() calls runtime.executeGroupBody(opts, body)
  ↓
executeGroupBody() calls createGroup(meta, body, groupOpts)
  ↓
createGroup() manages group context (enter/exit)
  ↓
UI shows group via engine.step("group", ...)
  ↓
RecursiveGroupContainer renders group with label + indentation
```

### Key Benefits

1. **True Plugin Independence**:

    - Group is a plugin like any other
    - Can be imported/exported independently
    - No special treatment in runtime flow API

2. **Extensible Architecture**:

    - Container plugin pattern can be reused
    - Future container plugins (tabs, sections, etc.) can use same pattern
    - Clean separation of concerns

3. **Backward Compatible**:

    - All existing examples work without changes
    - Both function signatures supported
    - Same behavior as before

4. **Proper Encapsulation**:
    - Group logic contained in plugin directory
    - Plugin provides all necessary hooks
    - Runtime only provides execution infrastructure

## Files Modified

### Created/Updated

-   `src/plugins/group/index.tsx` - Full plugin implementation
-   `src/plugins/group/README.md` - Documentation

### Core Changes

-   `src/types/index.ts` - Extended PromptPlugin type, simplified FlowFunction
-   `src/core/registry.ts` - Added container plugin support
-   `src/core/prompt-runtime.ts` - Added `executeGroupBody()`, removed group from flow API
-   `src/core/runtime-factory.ts` - Exposed `executeGroupBody`, removed direct `group` binding
-   `src/core/runtime-context.ts` - Updated RuntimeAPI interface

### Preserved

-   `src/components/RecursiveGroupContainer.tsx` - No changes needed (groups still render as type="group")
-   All examples - Work without modification

## Testing

Test with any example:

```bash
npx tsx examples/plugma.ts
npx tsx test-group-rendering.ts
```

Expected behavior:

-   ✅ Group labels display correctly
-   ✅ Indentation works (3 spaces per level)
-   ✅ Back navigation with ESC key
-   ✅ All flow types work (progressive, phased, static)
-   ✅ Nested groups work
-   ✅ Static groups with arrow navigation work

## Plugin Pattern for Containers

This establishes a pattern for creating container plugins:

```typescript
export const myContainer = createPlugin({
    type: "myContainer",
    component: MyContainerComponent,
    isContainer: true,
    execute: async (runtime, opts, body) => {
        // Custom logic before
        await runtime.someSetup(opts);

        // Execute body
        const result = await body();

        // Custom logic after
        await runtime.someCleanup(opts);

        return result;
    },
});
```

## Conclusion

The group function is now a **proper, independent plugin** with full architectural support. The plugin system has been extended to support container plugins, establishing a pattern that can be reused for future structural elements.

This is a significant architectural improvement that maintains backward compatibility while providing true plugin independence.
