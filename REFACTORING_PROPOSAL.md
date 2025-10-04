# Navigation & UI Refactoring Proposal

## Executive Summary

The current implementation has **~2,500 lines** of navigation and state management code with significant duplication due to parallel tree and legacy state systems. This proposal outlines how to reduce this to **~1,200-1,400 lines** (40-50% reduction) while improving maintainability.

---

## Current State Analysis

### Code Distribution

-   **PromptTree.ts**: 991 lines - Tree structure + legacy sync
-   **PromptApp.tsx**: 916 lines - UI + dual state management
-   **core.ts**: 590 lines - Runtime with discovery mode
-   **RecursiveGroupContainer.tsx**: 287 lines - Rendering logic
-   **Total**: ~2,784 lines

### Major Issues

#### 1. Dual State Management (Accounts for ~40% of complexity)

```typescript
// Current: Tree → Legacy conversion (140+ lines)
syncToLegacyState() {
  const fieldState: FieldState = { values: {}, visited: new Set(), ... };
  const groupState: GroupState = { progressive: new Set(), ... };
  const promptOrderState: PromptOrderState = { root: [], ... };
  // ... traverse tree and populate all three objects
}

// PromptApp has 20+ fake setters that just trigger re-renders
const setFieldValues = (_) => updateTreeState();
const setVisitedPrompts = (_) => updateTreeState();
// ... 18 more
```

**Why this exists**: Incomplete migration from legacy state to tree structure.

#### 2. Over-Complex Navigation (Accounts for ~25% of complexity)

```typescript
// 3 overlapping cleanup functions with similar logic:
clearFutureStateFrom(node) { /* 86 lines */ }
clearAllNodesAddedAfterField(field) { /* 70 lines */ }
clearUnreachableNodes() { /* 30 lines */ }

// Complex conditional logic for determining valid navigation
const isValidForwardNavigation = (() => {
  // 27 lines of nested conditionals
})();
```

#### 3. Redundant Tracking (Accounts for ~15% of complexity)

-   `completionHistoryRef` duplicates `tree.history + node.completed`
-   `groupIdToMessageRef` duplicates `node.label`
-   `staticGroupsRef` duplicates `node.flow === 'static'`

#### 4. Discovery Mode Overhead (Accounts for ~10% of complexity)

-   Adds 100+ lines to runtime
-   Requires separate state (`isDiscoveryMode`, `discoveredFields`)
-   Pre-discovery could be simplified

---

## Refactoring Strategy

### Phase 1: Eliminate Legacy State (Saves ~400-500 lines)

#### 1.1 Remove `syncToLegacyState()` and all fake setters

**Current (PromptApp.tsx)**:

```typescript
// 140 lines of conversion logic
syncToLegacyState() { ... }

// 20+ fake setters (80 lines)
const setFieldValues = (_) => updateTreeState();
const setVisitedPrompts = (_) => updateTreeState();
// ...

// Complex state access
const syncedState = useMemo(() => getSyncedState(), [getSyncedState]);
const state = getSyncedState();
```

**Proposed**:

```typescript
// Direct tree access everywhere
const treeManager = treeManagerRef.current;

// Components read directly from tree
const activeNode = treeManager.getActiveNode();
const fieldValue = activeNode?.value;
const isCompleted = activeNode?.completed;

// Single trigger for re-renders
const forceUpdate = () => setTreeRevision((prev) => prev + 1);
```

**Files to update**:

-   Remove `syncToLegacyState()` from PromptTree.ts (~140 lines)
-   Remove all fake setters from PromptApp.tsx (~80 lines)
-   Update CompletedFields plugin to read from tree directly (~30 lines saved)

**Estimated savings**: 250 lines directly, 200 lines from simplified logic

---

#### 1.2 Simplify Node Properties

**Current**:

```typescript
// Properties scattered between node and separate state
node.properties = { ...request }; // Everything stored here
fieldState.messages[node.id] = label;
fieldState.groupNames[node.id] = groupLabel;
fieldState.groupIds[node.id] = groupId;
```

**Proposed**:

```typescript
// Flatten essential properties onto node
interface PromptNode {
    id: string;
    type: "field" | "group";
    label?: string;
    value?: any;
    completed: boolean;
    visited: boolean;
    active: boolean;

    // Field-specific
    fieldType?: string;
    hideAfterSubmit?: boolean;
    excludeFromCompleted?: boolean;

    // Group-specific
    flow?: "progressive" | "phased" | "static";
    enableArrowNavigation?: boolean;

    // Navigation
    allowBack?: boolean;

    // Tree structure
    depth: number;
    children: PromptNode[];
    parent?: PromptNode;

    // Plugin-specific data (catch-all)
    pluginData?: Record<string, any>;
}
```

**Benefit**: No need to look up properties in multiple places, simpler access patterns.

---

### Phase 2: Consolidate Navigation Logic (Saves ~200-250 lines)

#### 2.1 Single Cleanup Function

**Current**: 3 separate functions with overlapping logic

```typescript
clearFutureStateFrom(node) { /* 86 lines */ }
clearAllNodesAddedAfterField(field) { /* 70 lines */ }
clearUnreachableNodes() { /* 30 lines */ }
```

**Proposed**: Single unified function

```typescript
/**
 * Remove nodes that are no longer valid in the current flow
 * @param strategy - What to clean up
 *   - 'from-node': Remove all nodes after a specific node
 *   - 'unreachable': Remove nodes not in active path
 *   - 'conditional': Remove conditional branches no longer valid
 */
private cleanupNodes(
  strategy: 'from-node' | 'unreachable' | 'conditional',
  context?: { node?: PromptNode; exceptPath?: string[] }
): void {
  const nodesToKeep = new Set<string>(['root']);

  // Build keep set based on strategy
  switch (strategy) {
    case 'from-node':
      this.markPathToNode(context.node, nodesToKeep);
      this.markHistoricalNodes(context.node, nodesToKeep);
      break;
    case 'unreachable':
      this.markActivePathNodes(nodesToKeep);
      break;
    case 'conditional':
      this.markNonConditionalNodes(nodesToKeep);
      break;
  }

  // Remove nodes not in keep set
  this.removeNodesExcept(nodesToKeep);
}

// Helper methods (each ~10-15 lines)
private markPathToNode(node, keepSet) { /* ... */ }
private markHistoricalNodes(node, keepSet) { /* ... */ }
private markActivePathNodes(keepSet) { /* ... */ }
private removeNodesExcept(keepSet) { /* ... */ }
```

**Benefits**:

-   Eliminates 180+ lines of duplicated traversal logic
-   Single place to maintain cleanup logic
-   Easier to reason about what gets cleaned up

---

#### 2.2 Simplify Navigation Decision Logic

**Current**:

```typescript
// 50+ lines of conditional logic determining if we should clear state
const wasVisitedBefore = node.visited;
const isInCurrentHistory = this.tree.history.some((n) => n.id === nodeId);
const isValidForwardNavigation = (() => {
    // 27 lines of nested checks
})();

if (wasVisitedBefore && !isInCurrentHistory && !isValidForwardNavigation) {
    this.clearFutureStateFrom(node);
}
```

**Proposed**:

```typescript
// Simple strategy pattern
private shouldClearStateOnNavigateTo(node: PromptNode): boolean {
  // Moving forward in sequence = no cleanup needed
  if (this.isForwardNavigation(node)) return false;

  // Revisiting from different path = cleanup needed
  if (this.isRevisitFromDifferentPath(node)) return true;

  // Default: no cleanup
  return false;
}

private isForwardNavigation(node: PromptNode): boolean {
  const active = this.tree.activeNode;
  if (!active) return true;

  // Same parent, moving to next sibling
  if (node.parent === active.parent) {
    return this.getSiblingIndex(node) > this.getSiblingIndex(active);
  }

  // Moving up tree (leaving nested group)
  return node.depth < active.depth && this.isAncestorSibling(node, active);
}

navigateTo(nodeId: string): NavigationResult {
  const node = this.getNode(nodeId);
  if (!node) return { success: false, reason: 'Node not found' };

  // Clean up if needed
  if (this.shouldClearStateOnNavigateTo(node)) {
    this.cleanupNodes('from-node', { node });
  }

  // Activate node
  this.activateNode(node);
  return { success: true, node };
}
```

**Benefits**:

-   Clear separation of concerns
-   Each method has single responsibility
-   Easy to test and debug

---

### Phase 3: Simplify Runtime (Saves ~150-200 lines)

#### 3.1 Remove Duplicate Tracking

**Current**:

```typescript
// Runtime tracks group structure separately from tree
let groupStack: string[] = [];
let groupDepths: Map<string, number> = new Map();
let progressiveGroups: Map<string, "progressive"> = new Map();
let phaseGroups: Map<string, "phased"> = new Map();
let staticGroups: Map<string, "static"> = new Map();

// Execution path tracked separately from tree history
let executionPath: Array<{
    id: string;
    kind: PromptKind;
    groupContext?: string;
    stepIndex: number;
}> = [];
```

**Proposed**:

```typescript
// Runtime only tracks UI interaction state
let currentStep = 0;
let interactivePrompts: string[] = [];
let answers: Answers = {};

// Everything else comes from tree
function getCurrentGroup(): string | null {
    return treeManager.getCurrentGroupId();
}

function getExecutionPath(): PromptNode[] {
    return treeManager.getNavigationPath();
}
```

**Benefits**:

-   Single source of truth (the tree)
-   No synchronization bugs
-   ~80 lines of tracking code removed

---

#### 3.2 Optimize Discovery Mode

**Current**: Full runtime simulation with placeholders

```typescript
// Discovery runs entire flow with dummy values
if (isDiscoveryMode) {
    const currentGroupId = groupStack[groupStack.length - 1];
    // Track field...
    // Use placeholder...
    return placeholderValue as T;
}
```

**Proposed**: Static analysis of flow function

```typescript
// Option 1: Introspect the flow function (if possible)
function discoverFields(groupBody: () => Promise<any>): FieldInfo[] {
    const discovered: FieldInfo[] = [];

    // Wrap prompt functions to intercept calls
    const mockRuntime = createMockRuntime((type, opts, id) => {
        discovered.push({ id, label: opts.label, type });
        return Promise.resolve(getDefaultValue(type));
    });

    // Run body once with mock
    await groupBody.call(mockRuntime);

    return discovered;
}

// Option 2: Require explicit field declarations for static groups
await group(
    { label: "Settings", flow: "static" },
    async () => {
        await text({ label: "Name", id: "name" });
        await text({ label: "Email", id: "email" });
    },
    {
        // Explicit declaration (opt-in for better perf)
        fields: [
            { id: "name", label: "Name", type: "text" },
            { id: "email", label: "Email", type: "text" },
        ],
    }
);
```

**Benefits**:

-   Option 1: Cleaner separation, no mode flag needed (~30 lines saved)
-   Option 2: Eliminates discovery entirely for static groups (~100 lines saved)

---

### Phase 4: Streamline PromptApp (Saves ~200-300 lines)

#### 4.1 Consolidate Handlers

**Current**: Multiple specialized handlers with duplication

```typescript
const handleClearGroupAndBack = useCallback(() => { /* 40 lines */ }, [...]);
const handlePreserveAndBack = useCallback((value) => { /* 20 lines */ }, [...]);
const handleSubmit = useCallback((value) => { /* 60 lines */ }, [...]);
const handleBack = useCallback(() => { /* 15 lines */ }, [...]);

// Plus helper functions
const createFieldInfo = useCallback(...);
const addFieldToHistory = useCallback(...);
const markFieldAsCompleted = useCallback(...);
```

**Proposed**: Unified submission handler

```typescript
const handleFieldAction = useCallback(
    (action: FieldAction) => {
        const { type, value, nodeId } = action;

        switch (type) {
            case "submit":
                treeManager.updateNode(nodeId, { value, completed: true });
                break;
            case "back":
                treeManager.goBack();
                break;
            case "preserve-back":
                treeManager.updateNode(nodeId, { value });
                treeManager.goBack();
                break;
            case "clear-group-back":
                treeManager.clearGroupAndGoBack(nodeId);
                break;
        }

        forceUpdate();
        resolveCurrentPrompt(value);
    },
    [treeManager]
);
```

**Benefits**:

-   Single handler replaces 4 handlers (~100 lines saved)
-   Tree operations encapsulated in tree manager
-   Simpler dependency tracking

---

#### 4.2 Simplify Prompt Request Handling

**Current**: 150+ lines of state updates and tree synchronization

```typescript
const promptFn = (request: PromptRequest): Promise<any> => {
    return new Promise((resolve) => {
        // 40 lines of special case handling
        // 60 lines of tree updates
        // 50 lines of legacy state updates
    });
};
```

**Proposed**: Thin wrapper over tree manager

```typescript
const promptFn = async (request: PromptRequest): Promise<any> => {
    // Special cases
    if (request.type === "completeFlow") {
        treeManager.markFlowComplete();
        forceUpdate();
        return;
    }

    // Add to tree and activate
    const node = treeManager.addPromptRequest(request);
    treeManager.navigateTo(node.id);
    forceUpdate();

    // Wait for user input
    return new Promise((resolve) => {
        resolverRef.current = resolve;
    });
};
```

**Benefits**:

-   Tree manager handles all state updates
-   No parallel state management
-   ~120 lines saved

---

### Phase 5: Optimize Tree Structure (Saves ~100-150 lines)

#### 5.1 Remove Redundant Index Structures

**Current**:

```typescript
interface PromptTree {
    root: PromptNode;
    activeNode: PromptNode | null;
    nodeIndex: Map<string, PromptNode>; // O(1) lookup
    history: PromptNode[]; // Navigation history
}
```

**Analysis**: History array is good, but do we need separate `activeNode` pointer?

**Proposed**:

```typescript
interface PromptTree {
  root: PromptNode;
  nodeIndex: Map<string, PromptNode>;
  history: PromptNode[]; // Last item is active node
}

getActiveNode(): PromptNode | null {
  return this.tree.history[this.tree.history.length - 1] || null;
}
```

**Benefits**:

-   One less thing to keep in sync
-   History is already the source of truth
-   ~20 lines of sync code removed

---

#### 5.2 Simplify Node Creation

**Current**: Complex parent finding logic (60+ lines)

```typescript
private findParentGroupIdByDepth(requestDepth: number): string | undefined {
  // 45 lines of searching logic
}

private addGroupRequest(request, currentGroupId?) {
  let parentGroupId = this.findParentGroupIdByDepth(...);
  // More logic...
}
```

**Proposed**: Explicit parent in API

```typescript
// Runtime always knows the current context
const currentContext = {
  groupId: groupStack[groupStack.length - 1],
  depth: groupStack.length
};

// Pass explicit parent when adding nodes
treeManager.addPromptRequest(request, currentContext.groupId);

// Tree manager simplified
addPromptRequest(request: PromptRequest, parentId?: string) {
  const parent = parentId ? this.getNode(parentId) : this.tree.root;
  return this.addNode({ ...request, depth: parent.depth + 1 }, parentId);
}
```

**Benefits**:

-   No complex inference logic needed
-   Explicit is better than implicit
-   ~40 lines saved

---

## Implementation Plan

### Step 1: Remove Legacy State (Week 1)

1. Update CompletedFields to read from tree
2. Remove `syncToLegacyState()`
3. Remove fake setters
4. Update PromptApp to use tree directly
5. Test thoroughly

**Risk**: Medium - Affects rendering logic  
**Estimated time**: 3-4 days  
**Line reduction**: ~450 lines

---

### Step 2: Consolidate Navigation (Week 1-2)

1. Implement unified `cleanupNodes()`
2. Simplify navigation decision logic
3. Update `navigateTo()` and `goBack()`
4. Remove old cleanup functions
5. Test navigation edge cases

**Risk**: Medium-High - Critical functionality  
**Estimated time**: 2-3 days  
**Line reduction**: ~200 lines

---

### Step 3: Simplify Runtime (Week 2)

1. Remove duplicate tracking structures
2. Use tree for all context queries
3. Optimize discovery mode (choose approach)
4. Test static groups thoroughly

**Risk**: Low-Medium  
**Estimated time**: 2-3 days  
**Line reduction**: ~150 lines

---

### Step 4: Streamline PromptApp (Week 2-3)

1. Consolidate handlers
2. Simplify prompt request handling
3. Remove redundant refs and state
4. Test all interaction paths

**Risk**: Medium  
**Estimated time**: 2-3 days  
**Line reduction**: ~250 lines

---

### Step 5: Optimize Tree (Week 3)

1. Simplify active node tracking
2. Remove parent finding logic
3. Update node creation API
4. Final cleanup and testing

**Risk**: Low  
**Estimated time**: 1-2 days  
**Line reduction**: ~100 lines

---

## Expected Outcomes

### Quantitative

-   **Total line reduction**: ~1,150-1,300 lines (40-45%)
-   **File size reduction**:
    -   PromptTree.ts: 991 → ~600 lines (40% reduction)
    -   PromptApp.tsx: 916 → ~500 lines (45% reduction)
    -   core.ts: 590 → ~450 lines (25% reduction)

### Qualitative

-   **Single source of truth**: Tree manages all state
-   **Simpler mental model**: No more parallel state systems
-   **Easier debugging**: One place to look for state
-   **Better performance**: Less synchronization overhead
-   **More maintainable**: Less code = fewer bugs

---

## Alternative Approaches

### Alternative 1: Keep Dual State, Remove Tree

**Pros**: Less refactoring work  
**Cons**: Misses opportunity to simplify, tree provides better structure  
**Verdict**: Not recommended - tree is superior architecture

### Alternative 2: Complete Rewrite

**Pros**: Clean slate, optimal design  
**Cons**: High risk, breaks existing features  
**Verdict**: Not recommended - incremental approach safer

### Alternative 3: Gradual Migration (Recommended)

**Pros**: Low risk, proven by existing TREE_IMPLEMENTATION.md  
**Cons**: Takes longer  
**Verdict**: **This proposal** - best balance of safety and improvement

---

## Testing Strategy

### Unit Tests

-   Tree navigation operations
-   Node cleanup logic
-   State queries and updates

### Integration Tests

-   Multi-level group navigation
-   Conditional field handling
-   Static group discovery
-   Backward navigation edge cases

### Manual Testing Checklist

-   [ ] Basic field navigation (forward/back)
-   [ ] Progressive group flow
-   [ ] Phased group flow
-   [ ] Static group with arrow navigation
-   [ ] Conditional fields (appearing/disappearing)
-   [ ] Deep nesting (3+ levels)
-   [ ] Back navigation from nested groups
-   [ ] Value preservation on back navigation
-   [ ] Clear group and back functionality

---

## Conclusion

This refactoring will:

1. **Reduce codebase by 40-45%** (~1,200 lines)
2. **Eliminate dual state management** (biggest complexity source)
3. **Simplify navigation logic** (consolidate 3 functions → 1)
4. **Improve maintainability** (single source of truth)
5. **Maintain backward compatibility** (gradual migration)

The tree structure is already 90% implemented - this proposal completes the migration and removes the legacy scaffolding that's making the code verbose.

**Recommendation**: Proceed with incremental implementation, starting with Phase 1 (highest impact, lowest risk).
