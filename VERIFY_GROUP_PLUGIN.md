# Group Plugin Verification

## Quick Test

Run any example to verify the group plugin works:

```bash
# Test basic group functionality
npx tsx examples/progressive.ts

# Test static groups
npx tsx examples/static.ts

# Test phased groups
npx tsx examples/phased.ts

# Test full plugma example with nested groups
npx tsx examples/plugma.ts
```

## What to Verify

### ✅ Group Labels

-   Group labels should display correctly (e.g., "Group 1", "User Info")
-   Labels should be colored gray

### ✅ Indentation

-   Fields inside groups should be indented 3 spaces
-   Nested groups should indent further (3 spaces per level)

### ✅ Back Navigation

-   Press ESC to go back to previous field
-   Values should be preserved when navigating back
-   Should work inside and outside groups

### ✅ Flow Types

-   **Progressive**: Fields appear one at a time
-   **Phased**: All fields visible, complete in order
-   **Static**: All fields discovered upfront, arrow key navigation

### ✅ Plugin Independence

-   Group is imported from main package like other plugins
-   No special handling in user code
-   Works exactly like text, confirm, radio, etc.

## Expected Behavior

All examples should work exactly as they did before the refactoring. The only difference is that `group` is now a proper plugin under the hood.

## Architecture Verification

Check that these files have the correct structure:

1. **`src/plugins/group/index.tsx`**

    - Contains `createPlugin()` call with `isContainer: true`
    - Has `execute` function
    - Exports `group()` function

2. **`src/types/index.ts`**

    - `PromptPlugin` has container plugin properties
    - `FlowFunction` doesn't require `group` in API

3. **`src/core/runtime-factory.ts`**

    - Doesn't directly bind `group` method
    - Exposes `executeGroupBody`

4. **`src/index.ts`**
    - Exports `group` from `src/plugins/group`

## Troubleshooting

### Issue: "Raw mode is not supported"

-   **Cause**: Running in non-TTY environment
-   **Solution**: Run in interactive terminal, not as background process

### Issue: Group labels not showing

-   **Cause**: Plugin not properly registered
-   **Solution**: Check that group plugin is imported in `src/index.ts`

### Issue: Indentation not working

-   **Cause**: RecursiveGroupContainer not rendering groups correctly
-   **Solution**: Verify groups still have `type: "group"` in tree

### Issue: Back navigation broken

-   **Cause**: BACK token not propagating
-   **Solution**: Check try/finally blocks in group execution preserve exceptions
