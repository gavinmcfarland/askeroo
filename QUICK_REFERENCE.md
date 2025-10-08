# Submission Type System - Quick Reference

## What Changed?

Auto-submit control moved from **configuration options** to **component code**, with submission type tracking for smart navigation.

## Quick Examples

### Creating an Auto-Submit Plugin

```typescript
export const note = createPrompt({
    type: "note",
    component: ({ node, options, events }) => {
        // Auto-submit when active
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                const timer = setTimeout(() => {
                    events.onSubmit("__auto"); // Special value
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit]);

        return <Box>{/* content */}</Box>;
    },
});
```

### Using Auto-Submit Plugins

```typescript
// Just call it - auto-submit is built in
await note("This auto-submits automatically");

// Control navigation only
await note("Message", { allowBack: false });
```

### Control Back Navigation

```typescript
// Prevent going back
await text({
    label: "Password",
    allowBack: false,
});
```

## How It Works

### Special Submit Values

| Value                                   | Type        | Stored Value |
| --------------------------------------- | ----------- | ------------ |
| `"__auto"`                              | `"auto"`    | `undefined`  |
| `"__skip"`                              | `"skipped"` | `undefined`  |
| `{ value: X, __submissionType: "auto"}` | `"auto"`    | `X`          |
| Normal value                            | `"manual"`  | That value   |

### Submission Flow

1. **Component submits**: `events.onSubmit("__auto")`
2. **System detects**: Special value → sets `submissionType: "auto"`
3. **Navigation considers**: Auto-submitted prompts can't be navigated back to

## Common Patterns

### Display-Only (No Value)

```typescript
useEffect(() => {
    if (node.state === "active" && events.onSubmit) {
        const timer = setTimeout(() => events.onSubmit("__auto"), 10);
        return () => clearTimeout(timer);
    }
}, [node.state, events.onSubmit]);
```

### Computed Value

```typescript
useEffect(() => {
    if (node.state === "active" && events.onSubmit && data) {
        events.onSubmit({
            value: data,
            __submissionType: "auto",
        });
    }
}, [node.state, events.onSubmit, data]);
```

### Conditional Auto-Submit

```typescript
useEffect(() => {
    if (node.state === "active" && events.onSubmit && options.autoMode) {
        const timer = setTimeout(() => events.onSubmit("__auto"), 10);
        return () => clearTimeout(timer);
    }
}, [node.state, events.onSubmit, options.autoMode]);
```

### Manual with Skip

```typescript
useInput(
    (input, key) => {
        if (key.escape) {
            events.onSubmit("__skip");
        } else if (key.return) {
            events.onSubmit(value);
        }
    },
    { isActive: node.state === "active" }
);
```

## Submission Types

-   `"manual"` - User pressed Enter (can go back)
-   `"auto"` - Auto-submitted (can't go back by default)
-   `"skipped"` - Programmatically skipped
-   `"programmatic"` - System submitted

## Check Back Navigation

```typescript
// Simple: node.allowBack is automatically computed
component: ({ node, options, events }) => {
    if (node.allowBack) {
        // Show back hint
    }
};

// Advanced: Access tree manager (rarely needed)
const treeManager = getCurrentTreeManager();
const prevNode = treeManager.getPreviousNode();

if (prevNode?.submissionType === "auto") {
    // Previous was auto-submitted
}
```

## API

### Component Props

```typescript
interface PluginComponentProps {
    node: {
        state: "active" | "completed" | "disabled";
        allowBack: boolean; // Computed: considers explicit setting, first prompt, and submission types
        // ... other node props
    };
    options: YourOptions;
    events: {
        onSubmit: (value: any) => void;
        onBack?: () => void;
        // ... other events
    };
}
```

### PromptTreeManager

```typescript
treeManager.getPreviousNode(); // Get previous prompt
treeManager.getNodeSubmissionType(nodeId); // How was it submitted?
treeManager.canGoBackEnhanced(); // Can user go back?
```

## Best Practices

1. **Use ~10ms delay**: `setTimeout(() => events.onSubmit("__auto"), 10)`
2. **Clean up timers**: Always return cleanup function
3. **Check node.state**: Only submit when `"active"`
4. **Use dependency arrays**: Include all deps in useEffect
5. **Set allowBack: false**: For prompts users shouldn't return to

## Examples

### Welcome Screen

```typescript
await note("Welcome!", { allowBack: false });
```

### Progress Display

```typescript
await completedFields({ maxFields: 3 });
```

### Point of No Return

```typescript
const confirm = await confirm({
    label: "Finalize?",
    allowBack: false,
});
```

## Files to Read

1. `SUBMISSION_TYPE_SYSTEM.md` - Full documentation
2. `COMPONENT_BASED_SUBMISSION.md` - Architecture details
3. `examples/submission-type-example.ts` - Working example

## Build & Test

```bash
npm run build
node dist/examples/submission-type-example.js
```
