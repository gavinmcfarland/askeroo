# Memory Leak Fix: Event Listener Accumulation

**Date:** October 4, 2025  
**Issue:** MaxListenersExceededWarning after completing 10+ fields

## Problem

When completing 10 or more fields in a prompt flow, Node.js would emit warnings:

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 input listeners added to [EventEmitter]. MaxListeners is 10.
```

### Root Cause

Each field component (TextField, RadioField, MultiField, etc.) uses Ink's `useInput` hook to handle keyboard input. The problem was:

1. **Listeners were registered on component mount** - When a component mounted, `useInput` registered an event listener
2. **Listeners stayed active after completion** - Even though fields were completed/disabled, their listeners remained registered
3. **Accumulation over time** - With 10+ fields rendered (showing completed states), each had an active listener, exceeding Node's default limit of 10

### Why This Happened

The field components had early returns in their `useInput` callbacks:

```typescript
useInput(async (input, key) => {
    if (submitted || completed || disabled) return; // Early exit
    // ... handle input
});
```

However, **the listener was still registered** because `useInput` doesn't know about these conditions - it registers the listener regardless of the early returns.

## Solution

Use Ink's `isActive` option in the `useInput` hook to conditionally register listeners only when fields are active:

```typescript
useInput(
    async (input, key) => {
        // ... handle input
    },
    {
        // Only register listener when field is actually active
        isActive: !disabled && !completed && !submitted,
    }
);
```

### Benefits

1. **No Memory Leaks** - Listeners are only registered for active fields
2. **Better Performance** - Fewer event handlers to process
3. **Cleaner Code** - Explicit about when input should be accepted
4. **Follows Best Practices** - Proper lifecycle management

## Files Updated

All field components that use `useInput`:

1. ✅ `src/plugins/text/TextField.tsx`
2. ✅ `src/plugins/radio/RadioField.tsx`
3. ✅ `src/plugins/multi/MultiField.tsx`
4. ✅ `src/plugins/confirm/ConfirmField.tsx`
5. ✅ `src/plugins/tasks/Tasks.tsx`

## Pattern Applied

**Before:**

```typescript
useInput(async (input, key) => {
    if (disabled || completed) return;
    // handle input
});
```

**After:**

```typescript
useInput(
    async (input, key) => {
        // handle input
    },
    {
        isActive: !disabled && !completed && !submitted,
    }
);
```

## Testing

Build successful: ✅  
No linter errors: ✅  
TypeScript compilation: ✅

### To Verify the Fix

Run any example with 10+ fields:

```bash
npm run example
```

You should no longer see the MaxListenersExceededWarning after completing fields.

## Technical Details

### What is `isActive`?

The `isActive` option in Ink's `useInput` hook:

-   When `true`: Hook is active and receives input
-   When `false`: Hook is inactive and listener is not registered
-   Dynamic: Can change during component lifecycle

### Event Emitter Limits

Node.js has a default limit of 10 listeners per EventEmitter:

-   Warning threshold: 11 listeners
-   Purpose: Detect memory leaks early
-   Can be increased: `emitter.setMaxListeners(n)`

However, increasing the limit would mask the underlying problem. The correct solution is to clean up listeners properly.

## Best Practices

When using `useInput` in Ink components:

1. ✅ **Always use `isActive`** for conditional input handling
2. ✅ **Base on component state** (disabled, completed, etc.)
3. ✅ **Keep early returns** as safety checks
4. ❌ Don't rely only on early returns in the callback
5. ❌ Don't increase max listeners to hide the problem

## Related Issues

This pattern should be applied to any future field components that use `useInput` to prevent similar memory leaks.
