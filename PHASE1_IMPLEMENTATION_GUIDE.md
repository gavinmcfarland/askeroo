# Phase 1 Implementation Guide: Remove Legacy State

This guide provides step-by-step instructions for implementing Phase 1 of the refactoring, which will eliminate dual state management and save ~450 lines of code.

---

## Overview

**Goal**: Make the PromptTree the single source of truth by removing `syncToLegacyState()` and all legacy state structures.

**Impact**:

-   Remove ~140 lines from PromptTree.ts
-   Remove ~80 lines from PromptApp.tsx
-   Simplify ~200 lines of state access logic
-   **Total**: ~420+ lines saved

**Risk Level**: Medium (affects rendering, but tree is already working)

**Estimated Time**: 3-4 days

---

## Prerequisites

Before starting, ensure:

1. All tests pass
2. You have a backup branch
3. You understand the current tree structure (read TREE_IMPLEMENTATION.md)

---

## Step 1: Update CompletedFields Plugin (Day 1 - Morning)

### Current State

The CompletedFields plugin receives legacy state objects:

```typescript
// In CompletedFieldsStore.ts
export function updateCompletedFieldsState(state: {
    fieldState: FieldState;
    promptOrderState: {
        rootFieldHistory: Array<FieldInfo>;
        groupFieldHistory: Map<string, Array<FieldInfo>>;
    };
}) {
    // Uses legacy state...
}
```

### Changes Needed

#### 1.1 Update CompletedFieldsStore.ts

Replace legacy state with tree manager:

```typescript
// src/plugins/completed-fields/CompletedFieldsStore.ts

import { PromptTreeManager, PromptNode } from "../../core/PromptTree.js";

let treeManager: PromptTreeManager | null = null;

export function setTreeManager(manager: PromptTreeManager) {
    treeManager = manager;
}

export function getCompletedFieldsData(): Array<{
    id: string;
    label: string;
    value: any;
    groupLabel?: string;
}> {
    if (!treeManager) return [];

    const completedFields: Array<any> = [];

    treeManager.traverseDepthFirst((node) => {
        if (
            node.type === "field" &&
            node.completed &&
            !node.excludeFromCompleted &&
            !node.hideAfterSubmit
        ) {
            completedFields.push({
                id: node.id,
                label: node.label || `${node.fieldType} field`,
                value: node.value,
                groupLabel:
                    node.parent?.type === "group"
                        ? node.parent.label
                        : undefined,
            });
        }
    });

    return completedFields;
}

// Remove old updateCompletedFieldsState function
```

#### 1.2 Update CompletedFields.tsx

```typescript
// src/plugins/completed-fields/CompletedFields.tsx

export function CompletedFields({ maxVisible = 3 }: Props) {
    const completedFields = getCompletedFieldsData();

    // Rest of rendering logic remains the same...
}
```

#### 1.3 Update PromptApp to provide tree manager

```typescript
// In PromptApp.tsx

import { setTreeManager } from "../../plugins/completed-fields/CompletedFieldsStore.js";

export function PromptApp({ onReady }: PromptAppProps) {
    const treeManagerRef = useRef<PromptTreeManager>(new PromptTreeManager());

    // Set tree manager once on mount
    useEffect(() => {
        setTreeManager(treeManagerRef.current);
    }, []);

    // REMOVE this effect:
    // useEffect(() => {
    //   const state = getSyncedState();
    //   updateCompletedFieldsState({ ... });
    // }, [getSyncedState]);
}
```

### Testing Step 1

Run your app and verify:

-   [ ] Completed fields still render correctly
-   [ ] Field labels are correct
-   [ ] Group labels appear correctly
-   [ ] maxVisible prop still works

---

## Step 2: Remove syncToLegacyState() (Day 1 - Afternoon)

### 2.1 Remove the method

```typescript
// In PromptTree.ts

// DELETE this entire method (lines 846-989):
// syncToLegacyState(): {
//   fieldState: FieldState;
//   groupState: GroupState;
//   promptOrderState: PromptOrderState;
// } { ... }
```

### 2.2 Remove type imports

```typescript
// In PromptTree.ts - Remove these imports:
import {
    PromptRequest,
    // DELETE: FieldState,
    // DELETE: GroupState,
    // DELETE: PromptOrderState,
} from "../types/index.js";
```

### Testing Step 2

Code should still compile (though PromptApp will need updates in next step).

---

## Step 3: Remove Fake Setters from PromptApp (Day 2 - Morning)

### 3.1 Remove all fake setter functions

```typescript
// In PromptApp.tsx

// DELETE all these (lines 68-123):
// const setFieldValues = (_: ...) => updateTreeState();
// const setVisitedPrompts = (_: ...) => updateTreeState();
// const setCompletedFields = (_: ...) => updateTreeState();
// ... (18 more setters)
```

### 3.2 Remove getSyncedState

```typescript
// DELETE these:
// const getSyncedState = useCallback(() => {
//   return treeManagerRef.current.syncToLegacyState();
// }, [treeRevision]);
//
// const syncedState = useMemo(() => getSyncedState(), [getSyncedState]);
```

### 3.3 Replace with simple tree access

```typescript
// Add this helper at the top of PromptApp:
const getTree = () => treeManagerRef.current;

// Or use treeManagerRef.current directly in code
```

### Testing Step 3

Code won't compile yet - we need to update all uses of syncedState in Step 4.

---

## Step 4: Update All State Access (Day 2 - Afternoon + Day 3)

### 4.1 Find all uses of syncedState / getSyncedState

Search for these patterns:

```bash
# In your terminal
cd /path/to/askeroo
grep -n "getSyncedState" src/prompts/shared/PromptApp.tsx
grep -n "syncedState" src/prompts/shared/PromptApp.tsx
```

### 4.2 Replace each usage

Here are the common patterns:

#### Pattern 1: Checking if field is in a group

**Before**:

```typescript
const state = getSyncedState();
const isPhaseGroup = state.groupState.phased.has(prompt.groupName);
const isStaticGroup = state.groupState.static.has(prompt.groupName);
```

**After**:

```typescript
const groupNode = prompt.groupName
    ? treeManagerRef.current.getNode(prompt.groupName)
    : null;
const isPhaseGroup = groupNode?.flow === "phased";
const isStaticGroup = groupNode?.flow === "static";
```

#### Pattern 2: Getting group order

**Before**:

```typescript
const state = getSyncedState();
const groupOrder = state.groupState.order;
const prevGroupIndex = groupOrder.indexOf(prevGroup);
```

**After**:

```typescript
const groupNodes = treeManagerRef.current.getNodesByType("group");
const groupOrder = groupNodes.map((g) => g.id);
const prevGroupIndex = groupOrder.indexOf(prevGroup);
```

#### Pattern 3: Checking field values

**Before**:

```typescript
const state = getSyncedState();
const fieldValue = state.fieldState.values[fieldId];
```

**After**:

```typescript
const fieldNode = treeManagerRef.current.getNode(fieldId);
const fieldValue = fieldNode?.value;
```

#### Pattern 4: Getting completed fields

**Before**:

```typescript
const state = getSyncedState();
Object.keys(state.fieldState.values).forEach((fieldId) => {
    newCompleted.add(fieldId);
});
```

**After**:

```typescript
treeManagerRef.current.traverseDepthFirst((node) => {
    if (node.type === "field" && node.value !== undefined) {
        newCompleted.add(node.id);
    }
});
```

### 4.3 Specific locations to update

Based on the code analysis, here are the specific places to update:

#### Location 1: handleClearGroupAndBack (lines 661-710)

**Before**:

```typescript
const handleClearGroupAndBack = useCallback(() => {
  if (!currentPrompt?.groupName) return;

  const state = getSyncedState();
  const groupName = currentPrompt.groupName;
  const clearGroupFields = (entries: any) =>
    state.promptOrderState.root.filter(
      (entry: any) => entry.id === entries && entry.groupName === groupName
    );

  // ... uses clearGroupFields multiple times
```

**After**:

```typescript
const handleClearGroupAndBack = useCallback(() => {
    if (!currentPrompt?.groupName) return;

    const groupNode = treeManagerRef.current.getNode(currentPrompt.groupName);
    if (!groupNode) return;

    // Clear the group through tree manager
    treeManagerRef.current.clearGroupAndGoBack(currentPrompt.id);
    setTreeRevision((prev) => prev + 1);

    const r = resolverRef.current;
    resolverRef.current = null;
    r?.({ __back: true });
}, [currentPrompt]);
```

**Add to PromptTree.ts**:

```typescript
// New method in PromptTreeManager
clearGroupAndGoBack(fieldId: string): void {
  const fieldNode = this.getNode(fieldId);
  if (!fieldNode?.parent || fieldNode.parent.type !== 'group') return;

  const groupNode = fieldNode.parent;

  // Remove all children from group
  const childrenToRemove = [...groupNode.children];
  childrenToRemove.forEach(child => {
    this.removeNodeFromTree(child);
  });

  // Go back
  this.goBack();
}
```

#### Location 2: addFieldToHistory (lines 558-636)

**Before**:

```typescript
const addFieldToHistory = useCallback(
  (prompt: PromptRequest, fieldInfo: FieldInfo) => {
    if (prompt.groupName) {
      const state = getSyncedState();
      const isPhaseGroup = state.groupState.phased.has(prompt.groupName);
      const isStaticGroup = state.groupState.static.has(prompt.groupName);
      // ...
```

**After**:

```typescript
const addFieldToHistory = useCallback(
  (prompt: PromptRequest, fieldInfo: FieldInfo) => {
    if (prompt.groupName) {
      const groupNode = treeManagerRef.current.getNode(prompt.groupName);
      const isPhaseGroup = groupNode?.flow === 'phased';
      const isStaticGroup = groupNode?.flow === 'static';
      // ...
```

**Note**: This function might be removable entirely since tree tracks everything automatically.

#### Location 3: Group completion effect (lines 830-875)

**Before**:

```typescript
useEffect(() => {
  const prevGroup = previousGroupRef.current;
  const state = getSyncedState();
  const groupOrder = state.groupState.order;
  // ...
```

**After**:

```typescript
useEffect(() => {
  const prevGroup = previousGroupRef.current;
  const groupNodes = treeManagerRef.current.getNodesByType('group');
  const groupOrder = groupNodes.map(g => g.id);
  // ...
```

### Testing Step 4

After each change:

1. Code should compile
2. Run the app
3. Test the specific functionality you just updated
4. Check console for errors

---

## Step 5: Clean Up Refs and State (Day 3 - Afternoon)

### 5.1 Remove unused refs

```typescript
// These can likely be removed:
const completionHistoryRef = useRef<string[]>([]); // Tracked by tree
const groupIdToMessageRef = useRef<Map<string, string | undefined>>(new Map()); // node.label
const staticGroupsRef = useRef<Set<string>>(new Set()); // node.flow === 'static'
```

**But be careful** - check each use before removing:

```bash
grep -n "completionHistoryRef" src/prompts/shared/PromptApp.tsx
grep -n "groupIdToMessageRef" src/prompts/shared/PromptApp.tsx
grep -n "staticGroupsRef" src/prompts/shared/PromptApp.tsx
```

### 5.2 Update uses of refs

#### completionHistoryRef → tree.getCompletedNodes()

**Before**:

```typescript
if (!completionHistoryRef.current.includes(prompt.id)) {
    completionHistoryRef.current.push(prompt.id);
}
```

**After**:

```typescript
// Not needed - tree tracks completion automatically
// Just mark node as completed:
treeManagerRef.current.updateNode(prompt.id, { completed: true });
```

#### groupIdToMessageRef → node.label

**Before**:

```typescript
groupIdToMessageRef.current.set(request.id, request.label);
// Later...
const groupDisplayName = groupIdToMessageRef.current.get(request.groupName);
```

**After**:

```typescript
// Already stored in tree when node is created
const groupNode = treeManagerRef.current.getNode(groupId);
const groupDisplayName = groupNode?.label;
```

#### staticGroupsRef → node.flow

**Before**:

```typescript
if (staticGroupsRef.current.has(request.groupName)) {
    // ...
}
```

**After**:

```typescript
const groupNode = treeManagerRef.current.getNode(request.groupName);
if (groupNode?.flow === "static") {
    // ...
}
```

---

## Step 6: Simplify PromptApp State (Day 4)

### 6.1 Remove state that's now in tree

These pieces of state might be removable:

```typescript
// Review and potentially remove:
const [currentGroup, setCurrentGroup] = useState<string | null>(null);
// Can be: treeManager.getCurrentGroupId()
```

### 6.2 Consolidate re-render triggers

Currently you have:

-   `setTreeRevision()` - triggers re-render
-   Multiple fake setters - also trigger via setTreeRevision

After Phase 1, only `setTreeRevision()` is needed:

```typescript
const forceUpdate = () => setTreeRevision((prev) => prev + 1);

// Use everywhere you need to trigger re-render after tree updates
```

---

## Testing Checklist

After all changes, test these scenarios:

### Basic Flow

-   [ ] Simple sequential fields work
-   [ ] Values are preserved
-   [ ] Completed fields render correctly

### Groups

-   [ ] Progressive group flow works
-   [ ] Phased group flow works
-   [ ] Static group with arrow navigation works
-   [ ] Nested groups (2-3 levels deep) work

### Navigation

-   [ ] Back navigation works
-   [ ] Value preservation on back works
-   [ ] Clear group and back works
-   [ ] allowBack=false is respected

### Edge Cases

-   [ ] First field (can't go back) works
-   [ ] Last field completion works
-   [ ] Empty field handling works
-   [ ] Field with initialValue works
-   [ ] hideAfterSubmit works
-   [ ] excludeFromCompleted works

### Plugins

-   [ ] CompletedFields renders correctly
-   [ ] Text fields work
-   [ ] Confirm fields work
-   [ ] Radio fields work
-   [ ] Multi fields work
-   [ ] Tasks plugin works

---

## Rollback Plan

If something goes wrong:

### Quick Rollback

```bash
git checkout main
git branch -D phase1-remove-legacy-state
```

### Partial Rollback

If only one step is problematic:

```bash
git revert <commit-hash-of-problematic-step>
```

### Debug Tips

1. Add console.logs to see what tree state looks like
2. Use browser React DevTools to inspect tree structure
3. Compare tree state before and after the change
4. Check that node relationships (parent/children) are correct

---

## Success Metrics

You'll know Phase 1 is complete when:

1. ✅ No references to `syncToLegacyState()`
2. ✅ No fake setter functions in PromptApp
3. ✅ All state accessed directly from tree
4. ✅ All tests pass
5. ✅ All manual testing scenarios pass
6. ✅ Code is ~450 lines shorter
7. ✅ No performance regressions

---

## Next Steps

After Phase 1 is complete and stable:

1. Commit and push changes
2. Let it bake for a few days of real use
3. If stable, proceed to Phase 2: Consolidate Navigation Logic

---

## Questions & Troubleshooting

### Q: Code won't compile after removing syncToLegacyState

**A**: You haven't updated all uses of `getSyncedState()`. Search for it and replace with direct tree access.

### Q: Completed fields don't render

**A**: Check that `setTreeManager()` is called in PromptApp and that tree nodes have `completed: true`.

### Q: Group flow doesn't work

**A**: Verify that group nodes have correct `flow` property ('progressive', 'phased', or 'static').

### Q: Back navigation clears too much state

**A**: The new `clearGroupAndGoBack()` method might need adjustment. Check that it only clears the specific group's children.

### Q: Tests are failing

**A**: Update tests to use tree manager instead of legacy state objects.

---

## Get Help

If you get stuck:

1. Compare your code to the "Before/After" examples in REFACTORING_EXAMPLES.md
2. Check the tree structure with: `console.log(treeManager.getTree())`
3. Verify node relationships with: `console.log(treeManager.printTree())` if that method exists

Remember: **Take it slow, test frequently, commit often!**

Good luck! 🚀
