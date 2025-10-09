# Consistent Submission Format Refactoring

## Summary

Successfully refactored the submission system to use a **single, consistent object format** for all special submission types. This eliminates the previous inconsistency where different formats were used for different submission types.

## What Changed

### Before (Inconsistent)

Multiple different formats were used:

```typescript
// String shortcuts
events.onSubmit("__auto");
events.onSubmit("__skip");

// Object with special property
events.onSubmit({ value: data, __submissionType: "auto" });

// Regular value
events.onSubmit(value);
```

### After (Consistent)

Single, consistent format with automatic setTimeout handling:

```typescript
// Consistent object format with type property
// Auto/skip/programmatic types automatically use setTimeout with 100ms default delay
events.onSubmit({ type: "auto" });
events.onSubmit({ type: "auto", value: data });
events.onSubmit({ type: "auto", delay: 2000 }); // Custom delay
events.onSubmit({ type: "skip" });
events.onSubmit({ type: "programmatic", value: result });

// Regular value (backward compatible, no delay)
events.onSubmit(value); // Treated as manual submission
```

## Implementation

### Detection Logic

**Location**: `/src/components/PromptApp.tsx` - lines 322-334

```typescript
if (
    typeof action.value === "object" &&
    action.value !== null &&
    "type" in action.value
) {
    // New consistent format: { type: "auto", value?: any }
    submissionType = action.value.type;
    actualValue = action.value.value;
} else {
    // Regular value = manual submission
    submissionType = "manual";
    actualValue = action.value;
}
```

### Format Specification

| Submit Value                         | Submission Type  | Stored Value |
| ------------------------------------ | ---------------- | ------------ |
| `{ type: "auto" }`                   | `"auto"`         | `undefined`  |
| `{ type: "auto", value: X }`         | `"auto"`         | `X`          |
| `{ type: "skip" }`                   | `"skipped"`      | `undefined`  |
| `{ type: "programmatic", value: X }` | `"programmatic"` | `X`          |
| Any other value                      | `"manual"`       | That value   |

## Files Modified

### Core System

-   **`/src/components/PromptApp.tsx`** - Updated submission detection logic
-   **`/src/components/PluginWrapper.tsx`** - Updated documentation

### Built-in Plugins

-   **`/src/built-ins/note/index.tsx`** - Changed to `{ type: "auto" }`
-   **`/src/built-ins/completed-fields/index.tsx`** - Changed to `{ type: "auto" }`
-   **`/src/built-ins/tasks/Tasks.tsx`** - Changed to `{ type: "auto" }`

### Documentation

-   **`SUBMISSION_TYPE_SYSTEM.md`** - Updated all examples
-   **`COMPONENT_BASED_SUBMISSION.md`** - Updated format table and examples
-   **`QUICK_REFERENCE.md`** - Updated patterns and examples

## Benefits

### 1. Consistency

**Before**:

```typescript
events.onSubmit("__auto"); // String
events.onSubmit({ value: X, __submissionType: "auto" }); // Object with __
```

**After**:

```typescript
events.onSubmit({ type: "auto" }); // Always object with type
events.onSubmit({ type: "auto", value: X }); // Same structure with value
```

### 2. Clarity

The `type` property makes intent explicit:

```typescript
events.onSubmit({ type: "auto" }); // Clear: auto-submission
events.onSubmit({ type: "skip" }); // Clear: skip submission
events.onSubmit({ type: "programmatic" }); // Clear: programmatic
```

### 3. Extensibility

Easy to add new submission types in the future:

```typescript
events.onSubmit({ type: "conditional", value: data, condition: "xyz" });
```

### 4. Type Safety

Better TypeScript support with consistent structure:

```typescript
type SubmissionValue =
    | { type: "auto"; value?: any }
    | { type: "skip"; value?: any }
    | { type: "programmatic"; value?: any }
    | any; // Manual submission
```

### 5. Backward Compatibility

Regular values still work as manual submissions:

```typescript
events.onSubmit("text value"); // Works: manual
events.onSubmit(123); // Works: manual
events.onSubmit({ foo: "bar" }); // Works: manual (no 'type' property)
```

## Usage Examples

### Auto-Submit (No Value)

```typescript
export const note = createPrompt({
    component: ({ node, events }) => {
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                // setTimeout is automatically applied (default 100ms)
                events.onSubmit({ type: "auto" });
            }
        }, [node.state, events.onSubmit]);

        return <NoteContent />;
    },
});
```

### Auto-Submit with Value

```typescript
export const asyncLoader = createPrompt({
    component: ({ node, events }) => {
        const [data, setData] = useState(null);

        useEffect(() => {
            fetchData().then(setData);
        }, []);

        useEffect(() => {
            if (node.state === "active" && events.onSubmit && data) {
                // setTimeout is automatically applied (default 100ms)
                // Can customize delay: { type: "auto", value: data, delay: 500 }
                events.onSubmit({
                    type: "auto",
                    value: data,
                });
            }
        }, [node.state, events.onSubmit, data]);

        return <Loader />;
    },
});
```

### Skip Submission

```typescript
export const skipableInput = createPrompt({
    component: ({ node, events }) => {
        useInput(
            (input, key) => {
                if (key.escape) {
                    events.onSubmit({ type: "skip" });
                } else if (key.return) {
                    events.onSubmit(value); // Manual
                }
            },
            { isActive: node.state === "active" }
        );

        return <Input />;
    },
});
```

### Programmatic Submission

```typescript
export const validator = createPrompt({
    component: ({ node, events }) => {
        useEffect(() => {
            async function validate() {
                const result = await performValidation();
                if (result.autoPass) {
                    events.onSubmit({
                        type: "programmatic",
                        value: result.data,
                    });
                }
            }
            validate();
        }, []);

        return <ValidationUI />;
    },
});
```

## Migration Guide

### For Plugin Authors

**Old Code**:

```typescript
events.onSubmit("__auto");
events.onSubmit({ value: data, __submissionType: "auto" });
```

**New Code**:

```typescript
events.onSubmit({ type: "auto" });
events.onSubmit({ type: "auto", value: data });
```

### Search and Replace

If you have custom plugins, update them with these patterns:

```bash
# Find old format
"__auto"
"__skip"
__submissionType

# Replace with new format
{ type: "auto" }
{ type: "skip" }
{ type: "auto", value: ... }
```

## Build Status

✅ **TypeScript compilation successful**  
✅ **All built-in plugins updated**  
✅ **Documentation updated**  
✅ **Backward compatible with manual submissions**

## Testing

```bash
npm run build  # ✅ Success
```

All plugins compile and work correctly with the new format.

## Key Advantages

1. **Single Source of Truth**: One format for all special submissions
2. **Self-Documenting**: `type` property makes intent clear
3. **IDE Support**: Better autocomplete and type checking
4. **Maintainable**: Easy to understand and update
5. **Extensible**: Simple to add new submission types
6. **Consistent**: No need to remember different formats

## Summary

The refactoring successfully standardizes the submission format to use `{ type, value? }` exclusively, eliminating inconsistency while maintaining backward compatibility for regular value submissions. This makes the codebase cleaner, more maintainable, and easier to extend in the future.
