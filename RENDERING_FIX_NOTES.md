# Ink Rendering Duplication Fix

## Problem Description

When navigating back (pressing Escape) in a terminal with limited height, the first prompt would be duplicated in the output. This issue occurred because:

1. When the terminal is below a certain height, Ink has to redraw the entire screen
2. During back navigation, tree state updates and React re-renders happen rapidly
3. Ink would render intermediate states while React was still reconciling changes
4. This caused visual duplication where the first prompt appeared twice in the terminal output

The issue was more apparent in short terminals because:

-   Tall terminals: Console history is preserved, Ink can do partial updates
-   Short terminals: Ink must clear and redraw everything, exposing timing issues

## Root Cause

1. Tree state is mutated (nodes removed, active node changed)
2. React state update is triggered (`setTreeRevision`)
3. Ink tries to render before React has fully processed the tree changes
4. This results in Ink rendering with a partial/inconsistent view of the tree state

## Solutions Implemented

### 1. Increased Micro-Delays (Enhanced Existing Fix)

**File:** `src/utils/ink-rendering-fix.ts`

```typescript
// Increased from 5 to 10 iterations
for (let i = 0; i < 10; i++) {
    process.stdout.write = () => true;
    console.log();
    process.stdout.write = originalStdout;
}
```

**Why:** More time for React to reconcile state changes before Ink renders.

### 2. Force Complete Remount on Back Navigation

**File:** `src/components/PromptApp.tsx`

```typescript
// Added renderKey state
const [renderKey, setRenderKey] = useState(0);

// Increment on back navigation
flushSync(() => {
    setTreeRevision((prev) => prev + 1);
    setRenderKey((prev) => prev + 1);
});

// Apply to RecursiveGroupContainer
<RecursiveGroupContainer
    key={renderKey}
    // ...
/>;
```

**Why:** Changing the `key` prop forces React to completely unmount and remount the entire component tree, preventing any stale state from persisting. This is particularly effective when Ink has to redraw the entire terminal.

### 3. ~~**Rendering Suppression During State Transitions**~~ ❌ **REMOVED - CAUSED BLINKING**

**Note:** This approach was initially implemented but has been **removed** because it caused the entire CLI to blink when navigating back.

**Why it was removed:** Returning `null` from the render function caused Ink to completely unmount the entire UI, clearing the terminal. When the component re-rendered after suppression was lifted, it would remount everything, creating a visible flash/blink effect. This was worse than the original duplication issue.

**Lesson learned:** Preventing intermediate renders by returning `null` is too aggressive for Ink-based applications. The combination of `renderKey` (forcing remount) and `flushSync` is sufficient to prevent duplication without causing visual artifacts.

### 4. Async Rendering Fix (Available for Future Use)

**File:** `src/utils/ink-rendering-fix.ts`

```typescript
export async function applyInkRenderingFixAsync(): Promise<void> {
    applyInkRenderingFix();

    await new Promise<void>((resolve) => {
        setImmediate(() => {
            setImmediate(() => {
                resolve();
            });
        });
    });
}
```

**Why:** Provides an async option that waits for multiple event loop ticks, ensuring complete React reconciliation. Currently not used but available if needed.

## How These Solutions Work Together

1. **Increased Micro-Delays** give React more time to reconcile state changes before Ink renders
2. **Force Remount** ensures a clean slate by completely remounting the component tree
3. **flushSync** ensures state updates happen synchronously before React re-renders

This approach ensures that:

-   React has sufficient time to reconcile all state changes
-   The component tree is completely refreshed on back navigation with a consistent state
-   Ink renders the correct state without intermediate artifacts
-   No visual blinking or flashing occurs during navigation

## Testing

To test the fix:

1. **Reduce terminal height** to force Ink to redraw the entire screen
2. **Navigate forward** through multiple prompts
3. **Press Escape** to navigate back
4. **Verify** that the first prompt is not duplicated

The fix should work in both:

-   Short terminals (where Ink redraws everything)
-   Tall terminals (where Ink can do partial updates)

## Files Modified

-   `src/utils/ink-rendering-fix.ts` - Enhanced with new strategies
-   `src/components/PromptApp.tsx` - Added renderKey for forced remount (output suppression removed due to blinking issue)

## Performance Impact

-   **Minimal:** The micro-delays are very short (synchronous console.log calls)
-   **Imperceptible:** The remount happens so quickly that users don't notice any delay
-   **Necessary:** These small delays prevent visual glitches that significantly degrade UX

## Future Improvements

If issues persist:

1. Consider using the async version with actual timeout delays
2. Implement a "rendering in progress" flag to prevent concurrent updates
3. Add terminal height detection to apply fixes only when needed
4. Investigate Ink's internal rendering pipeline for a more permanent solution
