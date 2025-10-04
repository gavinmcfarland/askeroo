# Refactoring Examples: Before & After

This document shows concrete examples of how the proposed refactoring will simplify the codebase.

---

## Example 1: Reading Field Values

### Before (Current - Verbose)

```typescript
// In PromptApp.tsx
const getSyncedState = useCallback(() => {
  return treeManagerRef.current.syncToLegacyState();
}, [treeRevision]);

const syncedState = useMemo(() => getSyncedState(), [getSyncedState]);

// In component
const fieldValue = syncedState.fieldState.values['field-id'];
const isCompleted = syncedState.fieldState.completed.has('field-id');
const groupName = syncedState.fieldState.groupNames['field-id'];

// In PromptTree.ts - syncToLegacyState() method (140 lines)
syncToLegacyState(): { fieldState, groupState, promptOrderState } {
  const fieldState: FieldState = { values: {}, visited: new Set(), ... };
  // ... traverse entire tree
  // ... populate 3 separate state objects
  // ... 140 lines of conversion logic
  return { fieldState, groupState, promptOrderState };
}
```

### After (Proposed - Simple)

```typescript
// In PromptApp.tsx
const treeManager = treeManagerRef.current;

// In component
const node = treeManager.getNode("field-id");
const fieldValue = node?.value;
const isCompleted = node?.completed;
const groupName = node?.parent?.label;

// No syncToLegacyState() method needed - direct access
```

**Lines saved**: ~140 lines (syncToLegacyState removed) + 20 lines (simplified access patterns)

---

## Example 2: Navigation Cleanup

### Before (Current - Complex)

```typescript
// Three separate cleanup functions with overlapping logic

// Function 1: clearFutureStateFrom (86 lines)
private clearFutureStateFrom(nodeToKeep: PromptNode): void {
  const nodesToKeep = new Set<string>();
  let current: PromptNode | undefined = nodeToKeep;
  while (current) {
    nodesToKeep.add(current.id);
    current = current.parent;
  }

  const nodeToKeepIndex = this.tree.history.indexOf(nodeToKeep);
  const historyUpToNode = this.tree.history.slice(0, nodeToKeepIndex + 1);
  historyUpToNode.forEach((node) => {
    nodesToKeep.add(node.id);
    let ancestor = node.parent;
    while (ancestor) {
      nodesToKeep.add(ancestor.id);
      ancestor = ancestor.parent;
    }
  });

  // ... another 60 lines of traversal and cleanup
}

// Function 2: clearAllNodesAddedAfterField (70 lines)
private clearAllNodesAddedAfterField(field: PromptNode): void {
  const firstVisitIndex = this.tree.history.findIndex(
    (n) => n.id === field.id
  );

  const nodesToKeep = new Set<string>();
  nodesToKeep.add("root");

  const historyUpToField = this.tree.history.slice(0, firstVisitIndex + 1);
  historyUpToField.forEach((node) => {
    nodesToKeep.add(node.id);
    let ancestor = node.parent;
    while (ancestor) {
      nodesToKeep.add(ancestor.id);
      ancestor = ancestor.parent;
    }
  });

  // ... another 50 lines of traversal and cleanup
}

// Function 3: clearUnreachableNodes (30 lines)
private clearUnreachableNodes(): void {
  const reachableNodes = new Set<string>();
  reachableNodes.add("root");

  if (this.tree.activeNode) {
    let current: PromptNode | undefined = this.tree.activeNode;
    while (current) {
      reachableNodes.add(current.id);
      current = current.parent;
    }
  }

  // ... another 20 lines
}

// Navigation logic (50+ lines of conditionals)
navigateTo(nodeId: string): NavigationResult {
  const node = this.tree.nodeIndex.get(nodeId);
  if (!node) return { success: false };

  const wasVisitedBefore = node.visited;
  const isInCurrentHistory = this.tree.history.some(n => n.id === nodeId);

  const isValidForwardNavigation = (() => {
    if (!this.tree.activeNode) return false;

    if (node.parent?.id === this.tree.activeNode.parent?.id) {
      const siblings = node.parent?.children || [];
      const activeIndex = siblings.indexOf(this.tree.activeNode);
      const nodeIndex = siblings.indexOf(node);
      return nodeIndex > activeIndex;
    }

    // ... 20 more lines of nested checks
  })();

  if (wasVisitedBefore && !isInCurrentHistory && !isValidForwardNavigation) {
    this.clearFutureStateFrom(node);
  }

  // ... activate node
}
```

### After (Proposed - Unified)

```typescript
// Single cleanup function with clear strategy pattern

/**
 * Unified node cleanup with different strategies
 */
private cleanupNodes(
  strategy: 'from-node' | 'unreachable',
  context?: { node?: PromptNode }
): void {
  const nodesToKeep = new Set<string>(['root']);

  if (strategy === 'from-node' && context?.node) {
    // Keep path to target node
    this.addPathToNode(context.node, nodesToKeep);
    // Keep historical nodes up to target
    this.addHistoricalNodes(context.node, nodesToKeep);
  } else if (strategy === 'unreachable') {
    // Keep only active path
    this.addActivePathNodes(nodesToKeep);
  }

  // Remove everything else
  this.removeNodesExcept(nodesToKeep);
}

// Small focused helpers (10-15 lines each)
private addPathToNode(node: PromptNode, keepSet: Set<string>): void {
  let current: PromptNode | undefined = node;
  while (current) {
    keepSet.add(current.id);
    current = current.parent;
  }
}

private addHistoricalNodes(upToNode: PromptNode, keepSet: Set<string>): void {
  const index = this.tree.history.indexOf(upToNode);
  const historySlice = this.tree.history.slice(0, index + 1);

  for (const node of historySlice) {
    this.addPathToNode(node, keepSet);
  }
}

private addActivePathNodes(keepSet: Set<string>): void {
  const active = this.getActiveNode();
  if (active) this.addPathToNode(active, keepSet);
}

private removeNodesExcept(keepSet: Set<string>): void {
  const toRemove: PromptNode[] = [];

  this.traverseDepthFirst((node) => {
    if (node.id !== 'root' && !keepSet.has(node.id)) {
      toRemove.push(node);
    }
  });

  // Remove deepest first
  toRemove.sort((a, b) => b.depth - a.depth)
          .forEach(node => this.removeNodeFromTree(node));
}

// Simplified navigation logic (clear intent)
navigateTo(nodeId: string): NavigationResult {
  const node = this.getNode(nodeId);
  if (!node) return { success: false, reason: 'Not found' };

  // Clean up if we're revisiting from a different path
  if (this.isRevisitFromDifferentPath(node)) {
    this.cleanupNodes('from-node', { node });
  }

  this.activateNode(node);
  return { success: true, node };
}

private isRevisitFromDifferentPath(node: PromptNode): boolean {
  // Already in history = same path
  if (this.tree.history.includes(node)) return false;

  // Not visited before = first time
  if (!node.visited) return false;

  // Forward navigation = not a revisit
  if (this.isForwardFromActive(node)) return false;

  // Everything else is a revisit from different path
  return true;
}

private isForwardFromActive(node: PromptNode): boolean {
  const active = this.getActiveNode();
  if (!active) return true;

  // Same parent, higher index = forward
  if (node.parent === active.parent) {
    return this.getChildIndex(node) > this.getChildIndex(active);
  }

  // Shallower depth, ancestor sibling = forward (leaving nested group)
  return node.depth < active.depth && this.isAncestorSibling(node, active);
}
```

**Lines saved**: ~120 lines (186 lines → ~65 lines)

**Benefits**:

-   Single cleanup function instead of 3
-   Clear strategy pattern
-   Small, testable helper methods
-   Navigation logic reads like English

---

## Example 3: Field Submission Handling

### Before (Current - Multiple Handlers)

```typescript
// In PromptApp.tsx - 4 separate handlers with duplication

// Handler 1: Clear group and go back (40 lines)
const handleClearGroupAndBack = useCallback(() => {
  if (!currentPrompt?.groupName) return;

  const state = getSyncedState();
  const groupName = currentPrompt.groupName;
  const clearGroupFields = (entries: any) =>
    state.promptOrderState.root.filter(
      (entry: any) => entry.id === entries && entry.groupName === groupName
    );

  setFieldValues((prev) => {
    const newValues = { ...prev };
    Object.keys(newValues).forEach((fieldId) => {
      if (clearGroupFields(fieldId).length > 0) {
        delete newValues[fieldId];
      }
    });
    return newValues;
  });

  setCompletedFields((prev) => {
    const newCompleted = new Set(prev);
    clearGroupFields([...newCompleted]).forEach((entry: any) =>
      newCompleted.delete(entry.id)
    );
    return newCompleted;
  });

  // ... more cleanup

  performTreeBackNavigation();
  const r = resolverRef.current;
  resolverRef.current = null;
  r?.({ __back: true });
}, [currentPrompt, getSyncedState, setFieldValues, ...12 more dependencies]);

// Handler 2: Preserve value and go back (30 lines)
const handlePreserveAndBack = useCallback(
  (actualValue: any) => {
    if (!currentPrompt) return;

    setFieldValues((prev) => ({
      ...prev,
      [currentPrompt.id]: actualValue,
    }));
    setVisitedPrompts((prev) => new Set(prev).add(currentPrompt.id));

    markFieldAsCompleted(currentPrompt, actualValue);
    addFieldToHistory(currentPrompt, createFieldInfo(currentPrompt));

    performTreeBackNavigation();
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.({ __back: true });
  },
  [currentPrompt, setFieldValues, ...8 more dependencies]
);

// Handler 3: Regular submit (60 lines)
const handleSubmit = useCallback(
  (value: any) => {
    if (resolverRef.current && currentPrompt) {
      if (currentPrompt.type !== "group") {
        // Handle special values
        if (typeof value === "object" && value?.__clearGroupAndBack) {
          handleClearGroupAndBack();
          return;
        }

        if (typeof value === "object" && value?.__preserveAndBack) {
          handlePreserveAndBack(value.value);
          return;
        }

        // Regular submit
        setFieldValues((prev) => ({ ...prev, [currentPrompt.id]: value }));
        setVisitedPrompts((prev) => new Set(prev).add(currentPrompt.id));

        // Update tree
        try {
          treeManagerRef.current.updateNode(currentPrompt.id, {
            value: value,
            visited: true,
            completed: !currentPrompt.excludeFromCompleted,
          });
          setTreeRevision((prev) => prev + 1);
        } catch (error) {
          console.warn("Tree update error:", error);
        }

        isNavigatingBack.current = false;
        markFieldAsCompleted(currentPrompt, value);
        addFieldToHistory(currentPrompt, createFieldInfo(currentPrompt));
      }

      const r = resolverRef.current;
      resolverRef.current = null;
      r(value);
    }
  },
  [currentPrompt, handleClearGroupAndBack, ...10 more dependencies]
);

// Handler 4: Back navigation (15 lines)
const handleBack = useCallback(() => {
  if (resolverRef.current && currentPrompt) {
    performTreeBackNavigation();
    isNavigatingBack.current = true;

    const r = resolverRef.current;
    resolverRef.current = null;
    r({ __back: true });
  }
}, [currentPrompt, performTreeBackNavigation]);

// Plus 3 helper functions (60 lines total)
const createFieldInfo = useCallback(...);
const addFieldToHistory = useCallback(...);
const markFieldAsCompleted = useCallback(...);
```

### After (Proposed - Single Handler)

```typescript
// In PromptApp.tsx - Single unified handler

type FieldAction =
  | { type: 'submit', value: any }
  | { type: 'back' }
  | { type: 'preserve-back', value: any }
  | { type: 'clear-group-back' };

const handleFieldAction = useCallback((action: FieldAction) => {
  if (!currentPrompt || currentPrompt.type === 'group') {
    return;
  }

  const nodeId = currentPrompt.id;

  // Update tree based on action
  switch (action.type) {
    case 'submit':
      treeManager.updateNode(nodeId, {
        value: action.value,
        visited: true,
        completed: !currentPrompt.excludeFromCompleted
      });
      break;

    case 'back':
      treeManager.goBack();
      break;

    case 'preserve-back':
      treeManager.updateNode(nodeId, { value: action.value });
      treeManager.goBack();
      break;

    case 'clear-group-back':
      treeManager.clearGroupAndGoBack(nodeId);
      break;
  }

  // Trigger re-render
  setTreeRevision(prev => prev + 1);

  // Resolve promise
  const resolver = resolverRef.current;
  resolverRef.current = null;
  resolver?.(action.type === 'back' ? { __back: true } : action.value);

}, [currentPrompt, treeManager]);

// Field components call with appropriate action
<TextField
  onSubmit={(value) => {
    if (typeof value === 'object' && '__clearGroupAndBack' in value) {
      handleFieldAction({ type: 'clear-group-back' });
    } else if (typeof value === 'object' && '__preserveAndBack' in value) {
      handleFieldAction({ type: 'preserve-back', value: value.value });
    } else {
      handleFieldAction({ type: 'submit', value });
    }
  }}
  onBack={() => handleFieldAction({ type: 'back' })}
/>

// Tree manager has new method
clearGroupAndGoBack(fieldId: string): void {
  const node = this.getNode(fieldId);
  if (!node?.parent || node.parent.type !== 'group') return;

  // Clear all children of the group
  node.parent.children.forEach(child => {
    this.removeNodeFromTree(child);
  });

  // Navigate back
  this.goBack();
}
```

**Lines saved**: ~110 lines (4 handlers + 3 helpers = ~205 lines → ~95 lines)

**Benefits**:

-   Single action handler instead of 4 specialized ones
-   Clear action type pattern
-   Tree operations encapsulated in tree manager
-   Much shorter dependency array (2 deps vs 15+)

---

## Example 4: Prompt Request Handling

### Before (Current - Complex State Updates)

```typescript
// In PromptApp.tsx - promptFn (150+ lines)
const promptFn = (request: PromptRequest): Promise<any> => {
    return new Promise((resolve) => {
        // Handle flow completion (20 lines)
        if (request.type === "completeFlow") {
            const state = getSyncedState();
            setCompletedFields((prev) => {
                const newCompleted = new Set(prev);
                Object.keys(state.fieldState.values).forEach((fieldId) => {
                    newCompleted.add(fieldId);
                    completionHistoryRef.current.push(fieldId);
                });
                return newCompleted;
            });
            setCurrentPrompt(null);
            resolve(undefined);
            return;
        }

        // Track first field (10 lines)
        if (
            request.type !== "group" &&
            firstFieldIdRef.current === null &&
            globalRegistry.isInteractive(request.type)
        ) {
            firstFieldIdRef.current = request.id;
        }

        // Update current prompt atomically (30 lines)
        flushSync(() => {
            const shouldCleanup =
                isNavigatingBack.current && request.type !== "group";

            if (shouldCleanup) {
                isNavigatingBack.current = false;
                setCurrentPrompt(request);
                setCompletedFields((prev) => {
                    if (!prev.has(request.id)) return prev;
                    const next = new Set(prev);
                    next.delete(request.id);
                    // ... more cleanup
                    return next;
                });
            } else {
                setCurrentPrompt(request);
            }
        });

        resolverRef.current = resolve;

        // Add to tree (50 lines)
        try {
            let currentGroup: string | null = null;

            if (request.type === "group") {
                const activeNode = treeManagerRef.current.getActiveNode();
                if (activeNode) {
                    if (activeNode.type === "group") {
                        currentGroup = activeNode.id;
                    } else {
                        const parentGroup =
                            treeManagerRef.current.findParentGroup(activeNode);
                        currentGroup = parentGroup?.id || null;
                    }
                }
                // ... more logic
            } else {
                // ... more field logic
            }

            treeManagerRef.current.addPromptRequest(request, currentGroup);

            if (request.type !== "group") {
                treeManagerRef.current.navigateTo(request.id);
            }

            setTreeRevision((prev) => prev + 1);
        } catch (error) {
            console.warn("Tree management error:", error);
        }

        // Store field properties (40 lines)
        if (request.type !== "group") {
            setFieldProperties((prev) => {
                const newMap = new Map(prev);
                newMap.set(request.id, request);
                return newMap;
            });

            setFieldMessages((prev) => ({
                ...prev,
                [request.id]:
                    request.label || request.message || `${request.type} field`,
            }));

            if (request.groupName) {
                setFieldGroupIds((prev) => ({
                    ...prev,
                    [request.id]: request.groupName,
                }));
                const groupDisplayName = groupIdToMessageRef.current.get(
                    request.groupName
                );
                if (groupDisplayName) {
                    setFieldGroupNames((prev) => ({
                        ...prev,
                        [request.id]: groupDisplayName,
                    }));
                }
            }
        }

        // Track prompt order (30 lines)
        if (request.type !== "group") {
            setRootPromptOrder((prev) => {
                const entry = {
                    id: request.id,
                    type: "field" as const,
                    groupName: request.groupName,
                };
                if (!prev.some((p) => p.id === request.id)) {
                    return [...prev, entry];
                }
                return prev;
            });

            // Static group tracking...
            if (
                request.groupName &&
                staticGroupsRef.current.has(request.groupName)
            ) {
                // ... more tracking
            }
        } else if (request.type === "group") {
            // ... group tracking (40 more lines)
        }

        // Update current group (10 lines)
        if (request.type !== "group") {
            setCurrentGroup(request.groupName || null);
        } else if (request.type === "group") {
            setCurrentGroup(request.id);
            // ... more group state updates
        }
    });
};
```

### After (Proposed - Thin Wrapper)

```typescript
// In PromptApp.tsx - promptFn (30 lines)
const promptFn = async (request: PromptRequest): Promise<any> => {
  // Special case: flow completion
  if (request.type === 'completeFlow') {
    treeManager.markFlowComplete();
    setTreeRevision(prev => prev + 1);
    setCurrentPrompt(null);
    return;
  }

  // Track first interactive field
  if (request.type !== 'group' &&
      !firstFieldRef.current &&
      globalRegistry.isInteractive(request.type)) {
    firstFieldRef.current = request.id;
  }

  // Add to tree and activate
  const node = treeManager.addPromptRequest(request);

  if (request.type !== 'group') {
    treeManager.navigateTo(node.id);
    setCurrentPrompt(request);
  }

  // Trigger re-render
  setTreeRevision(prev => prev + 1);

  // Wait for user input
  return new Promise(resolve => {
    resolverRef.current = resolve;
  });
};

// Tree manager handles all state management
// In PromptTree.ts
addPromptRequest(request: PromptRequest): PromptNode {
  const parentId = this.getCurrentGroupId();

  if (request.type === 'group') {
    return this.addGroupNode(request, parentId);
  } else {
    return this.addFieldNode(request, parentId);
  }
}

markFlowComplete(): void {
  this.traverseDepthFirst(node => {
    if (node.type === 'field' && node.value !== undefined) {
      node.completed = true;
    }
  });
}
```

**Lines saved**: ~120 lines (150 lines → ~30 lines in PromptApp)

**Benefits**:

-   Thin UI layer, fat domain layer (tree manager)
-   No parallel state updates needed
-   Single responsibility: UI just renders, tree manages state
-   Much easier to test tree operations in isolation

---

## Example 5: Rendering Completed Fields

### Before (Current - Manual Tracking)

```typescript
// In PromptApp.tsx - tracking completion order
const completionHistoryRef = useRef<string[]>([]);

// When marking complete
markFieldAsCompleted(currentPrompt, value);
if (!completionHistoryRef.current.includes(prompt.id)) {
    completionHistoryRef.current.push(prompt.id);
}

// When going back
const index = completionHistoryRef.current.indexOf(request.id);
if (index > -1) {
    completionHistoryRef.current.splice(index, 1);
}

// Rendering completed fields (legacy code - 100+ lines)
const renderCompletedItemsInOrder = () => {
    const state = getSyncedState();
    const rendered = new Set<string>();
    const elements: React.ReactNode[] = [];

    // Complex logic to determine order...
    const rootOrder = state.promptOrderState.root;

    for (const entry of rootOrder) {
        if (entry.type === "group") {
            // ... render group fields
        } else {
            // ... render root field
        }
    }

    return elements;
};
```

### After (Proposed - Tree Traversal)

```typescript
// In RecursiveGroupContainer.tsx - automatic rendering based on tree

export function RecursiveGroupContainer({ item, ... }: Props) {
  // For completed groups, render completed children
  if (item.completed && !item.active) {
    const completedChildren = item.children.filter(
      child => child.completed && !child.hideAfterSubmit
    );

    return (
      <Box flexDirection="column">
        {item.label && <Text color="gray">{item.label}</Text>}
        <Box flexDirection="column">
          {completedChildren.map(child => (
            <RecursiveGroupContainer
              key={child.id}
              item={child}
              {...props}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // For active groups, render visible children...
  // Tree structure already maintains correct order
}

// Root rendering
<RecursiveGroupContainer item={tree.root} {...props} />
```

**Lines saved**: ~80 lines (no manual tracking, no complex rendering logic)

**Benefits**:

-   Tree maintains order automatically
-   Recursive rendering is simpler
-   No separate completion tracking needed
-   Order is always correct (structure-based, not ref-based)

---

## Summary: Total Impact

| Area                 | Before           | After            | Saved      | % Reduction |
| -------------------- | ---------------- | ---------------- | ---------- | ----------- |
| State Management     | ~350 lines       | ~50 lines        | 300        | 86%         |
| Navigation Logic     | ~260 lines       | ~100 lines       | 160        | 62%         |
| Runtime Tracking     | ~180 lines       | ~80 lines        | 100        | 56%         |
| PromptApp Handlers   | ~205 lines       | ~95 lines        | 110        | 54%         |
| Prompt Handling      | ~150 lines       | ~30 lines        | 120        | 80%         |
| Rendering Logic      | ~180 lines       | ~100 lines       | 80         | 44%         |
| **Total Core Files** | **~2,784 lines** | **~1,455 lines** | **~1,329** | **48%**     |

### Key Takeaways

1. **Eliminating dual state** saves the most lines (300+)
2. **Consolidating navigation** makes code much clearer (160 lines saved)
3. **Single action handler** reduces complexity dramatically
4. **Tree as single source of truth** simplifies everything

The refactored code is not just shorter - it's **more maintainable, testable, and understandable**.
