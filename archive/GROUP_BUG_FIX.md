# Group Bug Fix - Multiple Groups at Same Level

## Problem

When two or more groups were used at the same level (either at root or nested inside another group), only the first group would be rendered. The second group and its prompts would not appear in the UI, causing the CLI to appear stuck or exit prematurely.

## Root Cause

The issue was in `src/components/PromptApp.tsx`. When groups were added to the tree, they were not being marked as `visited` or `active`. The `RecursiveGroupContainer` component filters children based on visibility rules, and only shows children that are:

-   `active`
-   `completed`
-   `visited`
-   OR the next pending item after all previous siblings are completed

Since groups were never marked with any of these states, sibling groups at the same level were being filtered out during rendering. The first group would render fine, but when Profile3 completed and Profile4 was created, Profile4 had no visibility state flags set, so it was filtered out.

### The Specific Issue

In `PromptApp.tsx` line 178-180:

```typescript
// Activate the prompt in the tree (crucial for rendering)
if (request.type !== "group") {
    treeManagerRef.current.navigateTo(request.id);
}
// Groups were NOT being activated or marked as visited!
```

Fields were properly activated via `navigateTo()`, but groups had no equivalent activation logic.

## Solution

Mark groups as both `visited` and `active` when they're added to the tree in `PromptApp.tsx`:

```typescript
// Activate the prompt in the tree (crucial for rendering)
if (request.type !== "group") {
    treeManagerRef.current.navigateTo(request.id);
} else {
    // Mark group as visited and active so it shows up in the tree
    const groupNode = treeManagerRef.current.getNode(request.id);
    if (groupNode) {
        groupNode.visited = true;
        groupNode.active = true; // Mark as active so it renders
    }
}
```

This ensures groups pass the visibility checks in `RecursiveGroupContainer` and are rendered along with their siblings.

## Additional Fixes Applied

While investigating, we also fixed a secondary issue where `completeFlow()` was being called prematurely after completing individual prompts (in `prompt-runtime.ts`). This has been removed so flow completion only occurs after the entire flow function returns.

## Impact

These fixes allow multiple groups to work correctly at any level:

```typescript
// Root level - multiple groups (FIXED)
const group1 = await group(
    async () => {
        const name = await text({ label: "Name" });
        return { name };
    },
    { label: "Group 1" }
);

const group2 = await group(
    async () => {
        const email = await text({ label: "Email" });
        return { email };
    },
    { label: "Group 2" }
);

// Nested - multiple sibling groups (FIXED)
const parent = await group(
    async () => {
        const profile3 = await group(
            async () => {
                /* ... */
            },
            { label: "Profile3" }
        );
        const profile4 = await group(
            async () => {
                /* ... */
            },
            { label: "Profile4" }
        );
        return { profile3, profile4 };
    },
    { label: "Parent" }
);
```

## Testing

To test this fix:

1. Run `npm run example test1` which has Profile3 and Profile4 as sibling groups
2. Verify both Profile3 and Profile4 render and their prompts are shown
3. Verify the flow completes successfully after all prompts

## Related Files

-   `src/components/PromptApp.tsx` - Fixed group visibility by marking groups as active/visited
-   `src/core/prompt-runtime.ts` - Removed premature flow completion check
-   `src/components/RecursiveGroupContainer.tsx` - Contains the visibility filtering logic (unchanged)
