# Auto-Submit Delay Feature

## Summary

Successfully implemented automatic `setTimeout` wrapping for auto/skip/programmatic submission types. Plugins no longer need to manually wrap their `onSubmit` calls in `setTimeout` - it's now built into the framework.

## What Changed

### Before

Plugins had to manually wrap auto-submit calls in `setTimeout`:

```typescript
useEffect(() => {
    if (node.state === "active" && events.onSubmit) {
        const timer = setTimeout(() => {
            events.onSubmit({ type: "auto" });
        }, 10);
        return () => clearTimeout(timer);
    }
}, [node.state, events.onSubmit]);
```

### After

Plugins can now call `onSubmit` directly - `setTimeout` is automatically applied:

```typescript
useEffect(() => {
    if (node.state === "active" && events.onSubmit) {
        // setTimeout is automatically applied (default 100ms)
        events.onSubmit({ type: "auto" });
    }
}, [node.state, events.onSubmit]);
```

## Implementation Details

### Location

**File**: `/src/components/PluginWrapper.tsx`

The `setTimeout` wrapper is applied in the `transformPropsToStructure` function, which wraps the `onSubmit` event handler before passing it to plugin components.

### Logic

1. When `onSubmit` is called with a submission object containing `type: "auto" | "skip" | "programmatic"`, the wrapper automatically applies `setTimeout`
2. The delay is extracted from the submission object's `delay` property, defaulting to 100ms if not specified
3. Manual submissions (non-objects or objects without a `type` property) are called immediately without delay

### API

```typescript
// Default delay (100ms)
events.onSubmit({ type: "auto" });

// Custom delay
events.onSubmit({ type: "auto", delay: 2000 }); // 2 second delay

// With value
events.onSubmit({ type: "auto", value: data, delay: 500 });

// Skip with custom delay
events.onSubmit({ type: "skip", delay: 200 });

// Programmatic with custom delay
events.onSubmit({ type: "programmatic", value: result, delay: 300 });

// Manual submission (immediate, no delay)
events.onSubmit(value); // Any non-object or object without 'type'
```

## Updated Files

### Core Implementation

-   `/src/components/PluginWrapper.tsx` - Added automatic `setTimeout` wrapper

### Built-in Plugins (removed manual setTimeout)

-   `/src/built-ins/note/index.tsx`
-   `/src/built-ins/completed-fields/index.tsx`

### Examples

-   `/examples/custom-plugin-with-core-imports.tsx`

### Documentation

-   `/SUBMISSION_TYPE_SYSTEM.md`
-   `/CONSISTENT_SUBMISSION_FORMAT.md`
-   `/COMPONENT_BASED_SUBMISSION.md`

## Benefits

1. **Cleaner Plugin Code**: Removes boilerplate setTimeout logic from every auto-submit plugin
2. **Consistent Behavior**: All auto/skip/programmatic submissions use the same default delay
3. **Customizable**: Plugins can easily customize the delay when needed
4. **Backward Compatible**: Manual submissions work exactly as before
5. **Less Error-Prone**: No need to remember cleanup logic for timers

## Testing

All tests pass, including:

-   Auto-submit with default delay (100ms) ✓
-   Auto-submit with custom delay (500ms) ✓
-   Skip with custom delay (200ms) ✓
-   Programmatic with value and delay (300ms) ✓
-   Manual submission (immediate, no delay) ✓

## Migration Guide

For existing custom plugins using auto-submit:

1. Remove the manual `setTimeout` wrapper and timer cleanup
2. Call `events.onSubmit({ type: "auto" })` directly
3. Optionally customize the delay with `{ type: "auto", delay: 2000 }`

No changes needed for plugin users - the API remains the same.
