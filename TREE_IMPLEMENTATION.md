# Unified Prompt Tree Implementation

This document explains the new unified prompt tree structure that's been implemented alongside the existing state management system.

## 🎯 Goals

The unified tree structure aims to:
- Replace fragmented state management with a single source of truth
- Enable recursive rendering with a single `GroupContainer` component
- Simplify backward navigation and state updates
- Maintain backward compatibility during migration

## 🌳 Tree Structure

### Core Components

1. **PromptNode**: Represents any prompt (field or group) in the tree
2. **PromptTreeManager**: Manages the tree structure and operations
3. **PromptTreeAdapter**: Bridges between old state and new tree (for migration)

### Data Structure

```typescript
interface PromptNode {
  id: string;
  type: 'field' | 'group';

  // Content
  label?: string;
  fieldType?: string; // 'text', 'confirm', etc.

  // State
  value?: any;
  completed: boolean;
  visited: boolean;
  active: boolean;

  // Tree structure
  children: PromptNode[];
  parent?: PromptNode;
  depth: number;

  // Plugin properties
  properties: Record<string, any>;
}
```

## 🚀 Implementation Status

### ✅ Phase 1: Core Infrastructure (COMPLETED)
- [x] `PromptNode` and `PromptTree` interfaces
- [x] `PromptTreeManager` class with tree operations
- [x] Tree utility functions (add, update, navigate, traverse)
- [x] `PromptTreeAdapter` for old state synchronization

### ✅ Phase 2: Integration (COMPLETED)
- [x] Tree state added to `PromptApp` (parallel to existing state)
- [x] Prompt requests automatically build tree structure
- [x] Field value updates sync to tree
- [x] Backward navigation uses tree structure
- [x] Debug utilities and testing

### 🔄 Phase 3: Rendering Migration (NEXT)
- [ ] Replace `renderCompletedFields` with recursive `GroupContainer`
- [ ] Replace `renderCompletedItemsInOrder` with tree traversal
- [ ] Update active field rendering to use tree
- [ ] Test rendering parity with existing implementation

### 🔄 Phase 4: State Cleanup (FUTURE)
- [ ] Remove old state management code
- [ ] Remove adapter layer
- [ ] Optimize tree operations
- [ ] Update StateRegistry to use tree structure

## 🔧 Current Usage

### Debugging the Tree

The tree runs parallel to existing state, so you can debug it without affecting functionality:

```typescript
// In PromptApp.tsx, the tree is available as:
// treeManagerRef.current

// Use these for debugging:
console.log(treeManagerRef.current.printTree());
console.log(treeManagerRef.current.getTreeStats());
console.log(treeManagerRef.current.getActiveNode());
```

### Running Tests

```bash
# Test core tree functionality
npx tsx src/tests/tree-test.ts

# Test integration with prompt system
npx tsx src/tests/integration-test.ts
```

### Debug Utilities

```typescript
import { createDebugger } from './core/PromptTreeDebug.js';

const debugger = createDebugger(treeManagerRef.current);
debugger.debugAll(); // Comprehensive debug output
debugger.validateTree(); // Check tree integrity
```

## 🔍 How It Works

### Tree Building
When a prompt request comes in, the adapter:
1. Creates a `PromptNode` from the `PromptRequest`
2. Adds it to the tree structure
3. Updates the node index for O(1) lookups
4. Maintains parent-child relationships

### Navigation
The tree provides enhanced navigation:
- **Forward**: `findNextActiveNode()` traverses tree to find next prompt
- **Backward**: `goBack()` uses navigation history with proper state cleanup
- **Group-aware**: Understands group boundaries and flows

### State Synchronization
During migration, the adapter maintains two-way sync:
- Tree → Old State: `syncTreeToOldState()`
- Old State → Tree: `syncOldStateToTree()`

## 🎯 Target Recursive Rendering

Once migration is complete, rendering will be simplified to:

```tsx
function GroupContainer({ item }: { item: PromptNode }) {
  return (
    <Box marginLeft={item.depth * 3}>
      {item.type === 'group' && item.label && (
        <Text color="gray">{item.label}</Text>
      )}

      {item.children.length > 0
        ? item.children.map((child) => (
            <GroupContainer key={child.id} item={child} />
          ))
        : <FieldComponent node={item} />
      }
    </Box>
  );
}

// Root rendering becomes:
<RootContainer>
  <GroupContainer item={tree.root} />
</RootContainer>
```

## 🛠 Migration Strategy

### Current Phase: Parallel Operation
- Tree runs alongside existing state management
- No functionality is disrupted
- Tree logs debug information to console
- All existing features continue to work

### Benefits Already Available
1. **Enhanced Navigation**: Tree-based back navigation with proper cleanup
2. **Better Debugging**: Clear tree structure visualization
3. **State Validation**: Tree integrity checking
4. **Future-Ready**: Foundation for recursive rendering

### Safety Measures
- Tree operations are wrapped in try-catch blocks
- Errors are logged as warnings, not failures
- Old state management remains untouched
- Easy rollback if issues arise

## 🔮 Future Enhancements

With the tree structure in place, these become possible:

### Advanced Navigation
```typescript
// Jump to specific prompts
tree.navigateTo('specific-field-id');

// Navigate to parent group
tree.goToParent();

// Navigate to root
tree.goToRoot();
```

### Tree Manipulation
```typescript
// Move nodes between groups
tree.moveNode('field-id', 'new-parent-id');

// Clone branches
tree.cloneBranch('group-id');

// Conditional field insertion
tree.insertNodeAfter('new-field', 'existing-field-id');
```

### Serialization
```typescript
// Save tree state
const savedState = tree.serialize();

// Restore tree state
tree.deserialize(savedState);
```

## 🔧 Next Steps

1. **Test the Current Implementation**
   - Run your app and interact with prompts
   - Check console for tree navigation messages
   - Verify backward navigation works correctly

2. **Begin Rendering Migration**
   - Start with simplest rendering case
   - Replace one rendering function at a time
   - Test thoroughly at each step

3. **Optimize and Clean Up**
   - Remove old state management once tree is proven
   - Optimize tree operations for performance
   - Add additional tree manipulation features as needed

The tree implementation is now ready for the next phase of development! 🎉