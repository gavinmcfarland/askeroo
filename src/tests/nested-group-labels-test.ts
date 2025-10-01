// Test nested group label rendering
// Run with: npx tsx src/tests/nested-group-labels-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🏷️ Testing Nested Group Label Rendering...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logTreeStructure(step: string) {
  const tree = treeManager.getTree();

  console.log(`\n--- ${step} ---`);
  console.log('Tree structure:');

  function printNode(node: any, indent: string = '') {
    console.log(`${indent}${node.id} (${node.type})`);
    console.log(`${indent}  label: "${node.label || 'NO LABEL'}"`);
    console.log(`${indent}  depth: ${node.depth}`);
    console.log(`${indent}  active: ${node.active}, completed: ${node.completed}, visited: ${node.visited}`);

    if (node.children && node.children.length > 0) {
      console.log(`${indent}  children:`);
      node.children.forEach((child: any) => {
        printNode(child, indent + '    ');
      });
    }
  }

  printNode(tree.root);
}

console.log('Setting up nested group scenario...');

// Create parent group
const parentGroup = {
  type: 'group',
  id: 'parent-group',
  label: 'Parent Group Label',
  flow: 'progressive' as const,
  depth: 0
};

adapter.addPromptRequestToTree(parentGroup);
logTreeStructure('After adding parent group');

// Create nested group
const nestedGroup = {
  type: 'group',
  id: 'nested-group',
  label: 'Nested Group Label',
  flow: 'progressive' as const,
  depth: 1
};

adapter.addPromptRequestToTree(nestedGroup, 'parent-group');
logTreeStructure('After adding nested group');

// Add a field to the nested group
const field1 = {
  type: 'text',
  id: 'nested-field',
  label: 'Field in nested group',
  depth: 2
};

adapter.addPromptRequestToTree(field1, 'nested-group');
logTreeStructure('After adding field to nested group');

// Test navigation and activation
console.log('\n=== TESTING NAVIGATION AND VISIBILITY ===');

// Navigate to the field to activate the chain
treeManager.navigateTo('nested-field');
logTreeStructure('After navigating to nested field');

// Complete the field
treeManager.updateNode('nested-field', { value: 'test value', completed: true });
logTreeStructure('After completing nested field');

console.log('\n=== CHECKING WHAT RECURSIVE CONTAINER WOULD SEE ===');

// Simulate what RecursiveGroupContainer would check
const rootNode = treeManager.getTree().root;

function checkGroupVisibility(node: any, depth: number = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}Checking node: ${node.id} (${node.type})`);
  console.log(`${indent}  Label: "${node.label || 'NO LABEL'}"`);
  console.log(`${indent}  Has children: ${node.children?.length > 0}`);

  if (node.type === 'group') {
    // Check if children would be visible
    const visibleChildren = node.children?.filter((child: any) => {
      // Simulate the visibility logic from RecursiveGroupContainer
      if (child.active || child.completed) {
        return true;
      }

      // For progressive flow, show next pending field
      if (node.flow === 'progressive') {
        const siblings = node.children;
        const childIndex = siblings.indexOf(child);
        const allPreviousCompleted = siblings.slice(0, childIndex).every((prev: any) => prev.completed);
        return allPreviousCompleted;
      }

      return false;
    }) || [];

    console.log(`${indent}  Visible children: ${visibleChildren.length}`);

    if (visibleChildren.length === 0) {
      console.log(`${indent}  ⚠️ Group has no visible children - label would only show if group has label: ${!!node.label}`);
    } else {
      console.log(`${indent}  ✅ Group has visible children - label should show: ${!!node.label}`);
    }

    // Check children recursively
    if (node.children) {
      node.children.forEach((child: any) => {
        checkGroupVisibility(child, depth + 1);
      });
    }
  }
}

checkGroupVisibility(rootNode);

console.log('\n=== ANALYSIS ===');

// Check if the issue might be in the group structure
const parentGroupNode = treeManager.getNode('parent-group');
const nestedGroupNode = treeManager.getNode('nested-group');
const fieldNode = treeManager.getNode('nested-field');

console.log('\nNode details:');
console.log(`Parent group: exists=${!!parentGroupNode}, label="${parentGroupNode?.label || 'NO LABEL'}"`);
console.log(`Nested group: exists=${!!nestedGroupNode}, label="${nestedGroupNode?.label || 'NO LABEL'}"`);
console.log(`Field: exists=${!!fieldNode}, label="${fieldNode?.label || 'NO LABEL'}"`);

if (parentGroupNode && nestedGroupNode && fieldNode) {
  console.log('\n✅ All nodes exist with proper structure');
  console.log('🔍 If labels are not showing, the issue is likely in:');
  console.log('  1. CSS/styling making labels invisible');
  console.log('  2. Conditional rendering logic in RecursiveGroupContainer');
  console.log('  3. Missing label prop passing in the component tree');
} else {
  console.log('\n❌ Some nodes are missing - check tree creation logic');
}

console.log('\n🎉 Nested group labels test completed!');