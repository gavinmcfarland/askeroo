# Auto-Submit Race Condition Fix

## Problem

When using more than 3 `note` prompts (auto-submit prompts) in sequence, subsequent interactive prompts like `multi` would return `undefined` instead of their actual values. This caused errors when trying to use the returned values (e.g., calling `.includes()` on an array).

## Root Cause

The issue was a **race condition with async auto-submissions**:

1. Auto-submit prompts (like `note`) wrapped their `onSubmit` calls in `setTimeout` with a 0ms delay
2. When multiple auto-submit prompts fired in quick succession, their submission callbacks were queued
3. By the time the `setTimeout` callbacks executed, `currentPrompt` had already moved to the next prompt
4. The submission for prompt N would resolve the promise for prompt N+1 (or later)
5. This caused a "chain reaction" where each prompt's value was assigned to the wrong promise

### Example Flow (Before Fix)

```
1. Note 0 shows → resolver_0 stored, currentPrompt = Note 0
2. Note 0 calls onSubmit → queues setTimeout callback
3. Note 1 shows → resolver_1 stored (overwrites resolver_0!), currentPrompt = Note 1
4. Note 0's setTimeout fires → resolves resolver_1 (wrong!) with undefined
5. Note 1 completes incorrectly
6. Multi prompt shows → resolver_multi stored
7. Multi prompt submits → resolves resolver_X (wrong!) with undefined
```

## Solution

The fix involved three key changes:

### 1. Store Resolvers by Prompt ID

Instead of storing a single `resolver` that gets overwritten, we now maintain a map of resolvers keyed by prompt ID:

```typescript
resolversByPromptId: new Map<string, (value: any) => void>();
```

### 2. Capture Prompt ID at Component Render Time

The `PluginWrapper` now captures the prompt ID when the component renders and includes it with async submissions:

```typescript
// Capture prompt ID in closure
const capturedPromptId = promptId;

setTimeout(() => {
    originalOnSubmit({ ...value, __promptId: capturedPromptId });
}, delay);
```

### 3. Use Captured ID to Look Up Correct Resolver

When handling submissions, we extract the captured prompt ID and use it to find the correct resolver:

```typescript
const promptId = value?.__promptId || currentPrompt?.id;
const resolver =
    nodeId && internalRefs.current.resolversByPromptId.has(nodeId)
        ? internalRefs.current.resolversByPromptId.get(nodeId)
        : internalRefs.current.resolver;
```

### 4. Memoize Event Handlers

To prevent unnecessary re-renders and duplicate submissions, we memoized the `onSubmit` wrapper in `PluginWrapper`:

```typescript
const wrappedOnSubmit = useMemo(() => {
    // ... wrapping logic
}, [props.onSubmit, promptId]);
```

## Files Changed

-   `src/components/PromptApp.tsx` - Added resolver map and ID-based lookup
-   `src/components/PluginWrapper.tsx` - Captured prompt ID and memoized event handlers
-   `src/components/RecursiveGroupContainer.tsx` - Passed prompt ID to PluginWrapper

## Verification

With this fix:

-   ✅ Multiple auto-submit prompts work correctly in sequence
-   ✅ Each prompt resolves with its correct value
-   ✅ No duplicate submissions occur
-   ✅ Interactive prompts after auto-submit prompts work correctly

## Example Usage

This now works correctly:

```typescript
await note("Note 1");
await note("Note 2");
await note("Note 3");
await note("Note 4");

const addons = await multi({
    label: "Choose addons:",
    options: [
        { value: "tailwind", label: "Tailwind" },
        { value: "shadcn", label: "Shadcn" },
    ],
});

// addons is now correctly an array, not undefined!
if (addons.includes("shadcn")) {
    console.log("Shadcn selected");
}
```
