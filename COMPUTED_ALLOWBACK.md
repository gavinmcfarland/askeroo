# Computed allowBack Property

## Overview

The `node.allowBack` property passed to plugin components is now **automatically computed** based on navigation context, including submission types. This means plugin developers can simply check `node.allowBack` without needing to query the tree manager or understand submission type logic.

## What Gets Computed

When a plugin component receives `node.allowBack`, it reflects:

1. **Explicit Setting**: If `allowBack: false` is set on the prompt, it's `false`
2. **First Prompt**: The first interactive prompt always has `allowBack: false`
3. **Previous Submission Type**: If previous prompt was auto-submitted, `allowBack: false`

## Implementation

The computation happens in `RecursiveGroupContainer.tsx`:

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

## Usage in Plugins

### Simple Check

```typescript
export const myPrompt = createPrompt({
    type: "myPrompt",
    component: ({ node, options, events }) => {
        // node.allowBack is already computed
        return (
            <Box>
                <Text>Your content</Text>
                {node.allowBack && (
                    <Text color="gray">Press Ctrl+C to go back</Text>
                )}
            </Box>
        );
    },
});
```

### Conditional Rendering

```typescript
export const formField = createPrompt({
    type: "formField",
    component: ({ node, options, events }) => {
        return (
            <Box flexDirection="column">
                <Text>{options.label}</Text>
                <TextInput value={value} onChange={onChange} />

                {node.allowBack ? (
                    <Text color="gray">↑ Back | ↓ Submit</Text>
                ) : (
                    <Text color="gray">↓ Submit only</Text>
                )}
            </Box>
        );
    },
});
```

### Disabling Back Functionality

```typescript
export const interactivePrompt = createPrompt({
    type: "interactivePrompt",
    component: ({ node, options, events }) => {
        useInput(
            (input, key) => {
                if (key.escape && node.allowBack) {
                    // Only allow back navigation if node.allowBack is true
                    events.onBack?.();
                } else if (key.return) {
                    events.onSubmit(value);
                }
            },
            { isActive: node.state === "active" }
        );

        return <YourComponent />;
    },
});
```

## How It Prevents Auto-Submit Navigation Issues

### Problem Before

Without computed `allowBack`, plugins had to:

1. Query the tree manager
2. Check previous node's submission type
3. Implement logic to determine if back navigation makes sense

```typescript
// Old approach - manual checking
const treeManager = getCurrentTreeManager();
const prevNode = treeManager.getPreviousNode();
const canGoBack =
    prevNode?.submissionType !== "auto" && node.allowBack !== false;
```

### Solution Now

With computed `allowBack`, plugins simply check the prop:

```typescript
// New approach - automatic
if (node.allowBack) {
    // Back navigation is allowed
}
```

### Automatic Prevention

When a note (auto-submitted) is followed by a text input:

```typescript
await note("Welcome!"); // Auto-submits
const name = await text({ label: "Name" }); // node.allowBack will be false
```

The text prompt automatically receives `node.allowBack: false` because going back would just trigger the note to auto-submit again, creating a confusing loop.

## Benefits for Plugin Developers

1. **Simpler Code**: No need to query tree manager
2. **Consistent Behavior**: All plugins automatically respect navigation rules
3. **Less Boilerplate**: Don't repeat navigation checking logic
4. **Type Safe**: Boolean prop, no complex queries
5. **Automatic Updates**: Computation happens on every render with current context

## Advanced: When to Query Tree Manager

You rarely need to query the tree manager directly, but if you need submission type details:

```typescript
import { getCurrentTreeManager } from "askeroo/core";

export const advancedPrompt = createPrompt({
    type: "advancedPrompt",
    component: ({ node, options, events }) => {
        // For special cases where you need submission type info
        const treeManager = getCurrentTreeManager();
        const previousNode = treeManager.getPreviousNode();

        if (previousNode?.submissionType === "auto") {
            // Custom behavior for auto-submitted previous prompts
            console.log("Previous prompt was auto-submitted");
        }

        // But for navigation, just use node.allowBack
        return (
            <Box>
                <Text>Content</Text>
                {node.allowBack && <BackHint />}
            </Box>
        );
    },
});
```

## Testing

When testing plugins, you can control `node.allowBack`:

```typescript
// Test with back navigation disabled
render(
    <MyPlugin
        node={{ state: "active", allowBack: false }}
        options={testOptions}
        events={testEvents}
    />
);

// Test with back navigation enabled
render(
    <MyPlugin
        node={{ state: "active", allowBack: true }}
        options={testOptions}
        events={testEvents}
    />
);
```

## Summary

The computed `node.allowBack` property:

-   ✅ Automatically considers all navigation constraints
-   ✅ Includes submission type logic
-   ✅ Simplifies plugin development
-   ✅ Prevents navigation loops with auto-submitted prompts
-   ✅ Consistent across all plugins
-   ✅ Type-safe and easy to test

Plugin developers can now simply check `node.allowBack` without understanding the underlying submission type system or navigation rules.
