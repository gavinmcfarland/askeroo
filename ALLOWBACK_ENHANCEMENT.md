# Computed allowBack Enhancement

## Summary

Successfully enhanced the `node.allowBack` property to automatically compute navigation availability based on submission types. Plugin developers can now simply check `node.allowBack` without querying the tree manager.

## What Changed

### Before

Plugin developers had to manually check navigation context:

```typescript
export const myPrompt = createPrompt({
    component: ({ node, options, events }) => {
        // Manual checking required
        const treeManager = getCurrentTreeManager();
        const prevNode = treeManager.getPreviousNode();
        const canGoBack =
            node.allowBack !== false && prevNode?.submissionType !== "auto";

        return <YourComponent canGoBack={canGoBack} />;
    },
});
```

### After

Plugin developers simply use the computed prop:

```typescript
export const myPrompt = createPrompt({
    component: ({ node, options, events }) => {
        // node.allowBack is automatically computed
        return <YourComponent canGoBack={node.allowBack} />;
    },
});
```

## Implementation

### Location

`/src/components/RecursiveGroupContainer.tsx` - lines 367-388

### Logic

```typescript
const computeEffectiveAllowBack = (): boolean => {
    // If explicitly set to false, respect it
    if (item.allowBack === false) return false;

    // First interactive prompt can't go back
    if (isFirstRootPrompt) return false;

    // Check if back navigation should be allowed based on previous node's submission type
    const canGoBackBasedOnHistory =
        treeManager.canGoBackBasedOnSubmissionType();

    // If previous node was auto-submitted (and doesn't explicitly allow back), prevent navigation
    if (!canGoBackBasedOnHistory) return false;

    // Default: allow back (node.allowBack is either true or undefined)
    return true;
};

const effectiveAllowBack = computeEffectiveAllowBack();
```

### Factors Considered

1. **Explicit Setting**: `allowBack: false` is always honored
2. **First Prompt**: First interactive prompt cannot go back
3. **Previous Submission Type**: Auto-submitted prompts prevent back navigation

## Benefits

### For Plugin Developers

-   ✅ **Simpler Code**: No tree manager queries needed
-   ✅ **Automatic Updates**: Recomputed on every render with current context
-   ✅ **Type Safe**: Simple boolean check
-   ✅ **Consistent**: All plugins automatically respect navigation rules
-   ✅ **Less Boilerplate**: Don't repeat navigation logic

### For End Users

-   ✅ **Better UX**: No navigation loops with auto-submitted prompts
-   ✅ **Predictable**: Consistent navigation behavior across all prompts
-   ✅ **Intuitive**: Can't go back to prompts that would just auto-submit again

## Example Use Cases

### Show Back Hint Conditionally

```typescript
export const textPrompt = createPrompt({
    type: "textPrompt",
    component: ({ node, options, events }) => {
        return (
            <Box flexDirection="column">
                <Text>{options.label}</Text>
                <TextInput />
                {node.allowBack && <Text color="gray">↑ Back | ↓ Submit</Text>}
            </Box>
        );
    },
});
```

### Disable Back Input Handler

```typescript
export const interactivePrompt = createPrompt({
    component: ({ node, options, events }) => {
        useInput(
            (input, key) => {
                if (key.escape && node.allowBack) {
                    // Only handle back if allowed
                    events.onBack?.();
                }
            },
            { isActive: node.state === "active" }
        );

        return <YourComponent />;
    },
});
```

### Conditional Rendering

```typescript
export const formPrompt = createPrompt({
    component: ({ node, options, events }) => {
        return (
            <Box>
                <YourForm />
                {node.allowBack ? (
                    <BackButton onClick={events.onBack} />
                ) : (
                    <Text color="gray">Cannot go back</Text>
                )}
            </Box>
        );
    },
});
```

## Flow Example

### Auto-Submit Preventing Back Navigation

```typescript
const flow = async () => {
    // Step 1: Welcome note (auto-submits)
    await note("Welcome to the wizard!");
    // Submission type: "auto"

    // Step 2: Name input
    const name = await text({ label: "Your name" });
    // node.allowBack is FALSE (previous was auto-submitted)

    // Step 3: Confirm
    const confirmed = await confirm({ label: "Correct?" });
    // node.allowBack is TRUE (previous was manual)

    return { name, confirmed };
};
```

In this flow:

-   The `text` prompt has `node.allowBack: false` because going back would just trigger the note to auto-submit again
-   The `confirm` prompt has `node.allowBack: true` because the previous `text` was manually submitted

## Documentation Created

1. **`COMPUTED_ALLOWBACK.md`** - Comprehensive guide on the computed property
2. Updated **`SUBMISSION_TYPE_SYSTEM.md`** - Reflects automatic computation
3. Updated **`COMPONENT_BASED_SUBMISSION.md`** - Added benefits section
4. Updated **`QUICK_REFERENCE.md`** - Simplified API examples

## Testing

Build status: ✅ Successful

```bash
npm run build  # No errors
```

All TypeScript compilation successful with no new errors.

## Files Modified

-   `/src/components/RecursiveGroupContainer.tsx` - Added `computeEffectiveAllowBack` function
-   `/SUBMISSION_TYPE_SYSTEM.md` - Updated navigation checking section
-   `/COMPONENT_BASED_SUBMISSION.md` - Added computed props benefit
-   `/QUICK_REFERENCE.md` - Updated API and examples
-   `/COMPUTED_ALLOWBACK.md` - New comprehensive guide

## Migration Impact

### Backward Compatible

Existing code continues to work unchanged:

-   Plugins that don't check `allowBack` → No change
-   Plugins that check `allowBack` → Now get computed value automatically
-   User code setting `allowBack: false` → Still works, always honored

### Breaking Changes

None. This is a pure enhancement that makes the existing property smarter.

## Summary

The computed `node.allowBack` property provides a cleaner, more intuitive API for plugin developers while automatically preventing navigation loops with auto-submitted prompts. Plugin developers can now focus on building features instead of managing navigation logic.

### Key Improvements

1. **API Simplification**: From manual tree queries to single prop check
2. **Automatic Prevention**: No navigation loops with auto-submitted prompts
3. **Consistent Behavior**: All plugins respect submission type rules automatically
4. **Better Developer Experience**: Less code, clearer intent
5. **Type Safety**: Simple boolean instead of complex queries

This enhancement completes the submission type system by making navigation context automatically available to all plugins through a computed property.
