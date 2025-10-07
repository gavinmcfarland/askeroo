# Hint Blinking Fix - Final Solution

## Problem

When navigating back between prompts, hints would flicker in multiple scenarios:

1. When navigating back to a prompt WITHOUT a hint, the previous prompt's hint would briefly show before disappearing
2. When navigating back to a prompt WITH a hint, the hint would disappear briefly before reappearing

This created jarring visual flickers in both cases during back navigation.

## Root Cause

The hint management system stores hints per prompt ID in a Map (`hintsByPromptId`). However, there was a **synchronization issue** between two different states:

1. **Tree state** - Updated immediately during navigation via `performTreeBackNavigation()` with `flushSync`
2. **currentPrompt state** - Updated asynchronously when the runtime calls `promptFn` again with the previous prompt

### The Timing Problem

During back navigation, the sequence was:

1. User presses Escape on Prompt B
2. `performTreeBackNavigation()` updates tree state → Prompt A becomes active in tree
3. Component re-renders with new tree state (via `flushSync`)
4. `currentHintText` is computed from `currentPrompt.id` (still Prompt B!)
5. Hint lookup fails or returns wrong hint → flicker
6. Runtime resolves with `__back` and calls `promptFn(Prompt A)`
7. `setCurrentPrompt(Prompt A)` updates state
8. Component re-renders again
9. `currentHintText` now computed from correct prompt → hint appears

The key issue: **Tree state and `currentPrompt` state were out of sync during the transition.**

## Solution

Compute `currentHintText` based on the **active node from the tree** instead of from `currentPrompt`. This ensures the hint is always synchronized with the actual active field in the tree, regardless of when `currentPrompt` gets updated.

### Key Change

**File:** `src/components/PromptApp.tsx` (lines 89-95)

**Before:**

```typescript
// Get hint for current prompt only
const currentHintText = currentPrompt?.id
    ? internalRefs.current.hintsByPromptId.get(currentPrompt.id) || null
    : null;
```

**After:**

```typescript
// Get hint for the ACTIVE node from the tree (not currentPrompt)
// This ensures hint stays in sync with tree state during navigation
const activeNode = treeManagerRef.current.getActiveNode();
const currentHintText = activeNode?.id
    ? internalRefs.current.hintsByPromptId.get(activeNode.id) || null
    : null;
```

### Why This Works

1. **Tree is the source of truth** - The tree state is always updated first and synchronously via `flushSync`
2. **No more async mismatch** - We read from the tree's active node directly, not waiting for `currentPrompt` to update
3. **No hint deletion needed** - We don't need to delete or clear hints; proper scoping via tree's active node ID is sufficient
4. **Preserved hints** - Hints remain in the Map and are immediately available when navigating back

### New Flow During Back Navigation

1. User presses Escape on Prompt B
2. `performTreeBackNavigation()` updates tree → Prompt A becomes active
3. Component re-renders (via `flushSync`)
4. `activeNode = treeManager.getActiveNode()` → returns Prompt A node
5. `currentHintText = Map.get(Prompt A's ID)` → gets Prompt A's hint immediately
6. Hint displays correctly from the very first render → **no flicker**
7. Later, `currentPrompt` updates to Prompt A (but doesn't matter for hint display)

## Comparison of Attempted Solutions

| Approach                                      | Issue                                    | Result                                         |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| **1. useEffect to clear hints**               | Runs after render                        | ❌ Flicker (hint visible during first render)  |
| **2. Clear all hints before navigation**      | Removes hints we need                    | ❌ Flicker (hint disappears then reappears)    |
| **3. Delete current hint before navigation**  | currentPrompt still points to old prompt | ❌ Flicker (timing mismatch)                   |
| **4. Use tree's active node for hint lookup** | Synchronized with tree state             | ✅ No flicker (correct hint from first render) |

## Implementation Details

The fix relies on the tree manager's `getActiveNode()` method, which returns the currently active field node from the tree. Since the tree is the source of truth and is updated synchronously during navigation, using it for hint lookup ensures perfect synchronization.

No hints are deleted or cleared during navigation - they remain in the Map and are accessed based on which field is actually active according to the tree.

## Reference

This fix was developed specifically for the tree-based architecture in `version27`, learning from earlier attempts in `version24-c`.

## Testing

To manually test this fix:

1. **Test Case 1 - Back to prompt WITHOUT hint:**

    - Navigate through: Text A (hint) → Note B (no hint) → Text C (hint)
    - Press Escape to go back to Note B
    - ✅ Verify no hint appears (no flicker from Text C's hint)

2. **Test Case 2 - Back to prompt WITH hint:**

    - Navigate through: Text A (hint) → Confirm B (hint) → Text C (hint)
    - Press Escape to go back to Confirm B
    - ✅ Verify Confirm B's hint appears immediately (no flicker)
    - Press Escape again to go back to Text A
    - ✅ Verify Text A's hint appears immediately (no flicker)

3. **Test Case 3 - Rapid back navigation:**
    - Navigate through multiple prompts
    - Rapidly press Escape multiple times
    - ✅ Verify hints appear/disappear smoothly without any flicker

Example test flow:

```typescript
const flow = async () => {
    const name = await text({ label: "Name?" }); // Has hint
    const age = await text({ label: "Age?" }); // Has hint
    const city = await text({ label: "City?" }); // Has hint
    return { name, age, city };
};
```

Navigate forward through all three, then press Escape repeatedly. Hints should transition smoothly without any flicker.
