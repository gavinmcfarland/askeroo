// Check if the real tree structure matches expectations
// Run with: npx tsx src/tests/check-real-tree-structure.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔍 Checking Real Tree Structure for Nested Groups...\n');

// Let me recreate the exact flow that might be happening in your app
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logDetailedTree() {
  const tree = treeManager.getTree();

  console.log('\n=== DETAILED TREE STRUCTURE ===');

  function printNode(node: any, indent = '', index = 0) {
    const status = node.active ? '🟢' : node.completed ? '✅' : '⚪';
    const labelInfo = node.label ? `"${node.label}"` : 'NO-LABEL';

    console.log(`${indent}${index}: ${node.id} (${node.type}) ${status} ${labelInfo} depth=${node.depth}`);

    if (node.children && node.children.length > 0) {
      console.log(`${indent}   └─ children (${node.children.length}):`);
      node.children.forEach((child: any, childIndex: number) => {
        printNode(child, indent + '      ', childIndex);
      });
    }
  }

  printNode(tree.root);

  // Also check the node index
  console.log('\n=== NODE INDEX ===');
  const allNodes = Array.from(tree.nodeIndex.entries());
  allNodes.forEach(([id, node]) => {
    console.log(`${id}: type=${node.type}, label="${node.label || 'NONE'}", depth=${node.depth}, parent=${node.parent?.id || 'NONE'}`);
  });
}

console.log('Scenario 1: Groups added in wrong order (potential real-world issue)');

// What might be happening in your app - groups added without proper parent specification
adapter.addPromptRequestToTree({
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
});

// Add some fields to group1
adapter.addPromptRequestToTree({
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
}, 'group1');

adapter.addPromptRequestToTree({
  type: 'select',
  id: 'type-field',
  label: 'Choose a type:',
  depth: 1
}, 'group1');

// What if group2 is added without specifying parent? (This might be the bug)
adapter.addPromptRequestToTree({
  type: 'group',
  id: 'group2-wrong',
  label: 'Group 2',
  flow: 'progressive' as const,
  depth: 1  // Wrong! This will make it find group1 as parent, but maybe logic is wrong
});

logDetailedTree();

console.log('\n=== TESTING CORRECTED SCENARIO ===');

// Reset and try correct approach
const treeManager2 = new PromptTreeManager();
const adapter2 = new PromptTreeAdapter(treeManager2);

// Add group1
adapter2.addPromptRequestToTree({
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
});

// Add fields to group1
adapter2.addPromptRequestToTree({
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
}, 'group1');

adapter2.addPromptRequestToTree({
  type: 'select',
  id: 'type-field',
  label: 'Choose a type:',
  depth: 1
}, 'group1');

// Correctly add group2 as child of group1
adapter2.addPromptRequestToTree({
  type: 'group',
  id: 'group2-correct',
  label: 'Group 2',
  flow: 'progressive' as const,
  depth: 1
}, 'group1');  // ← Explicitly specify parent

// Add fields to group2
adapter2.addPromptRequestToTree({
  type: 'multi',
  id: 'addons-field',
  label: 'Choose addons:',
  depth: 2
}, 'group2-correct');

adapter2.addPromptRequestToTree({
  type: 'select',
  id: 'style-field',
  label: 'Choose a style:',
  depth: 2
}, 'group2-correct');

console.log('\n=== CORRECTED TREE ===');
const tree2 = treeManager2.getTree();

function printNode2(node: any, indent = '', index = 0) {
  const status = node.active ? '🟢' : node.completed ? '✅' : '⚪';
  const labelInfo = node.label ? `"${node.label}"` : 'NO-LABEL';

  console.log(`${indent}${index}: ${node.id} (${node.type}) ${status} ${labelInfo} depth=${node.depth}`);

  if (node.children && node.children.length > 0) {
    console.log(`${indent}   └─ children (${node.children.length}):`);
    node.children.forEach((child: any, childIndex: number) => {
      printNode2(child, indent + '      ', childIndex);
    });
  }
}

printNode2(tree2.root);

// Simulate user progression
console.log('\n=== SIMULATING USER PROGRESSION ===');

treeManager2.navigateTo('location-field');
treeManager2.updateNode('location-field', { value: './my-plugin', completed: true });

treeManager2.navigateTo('type-field');
treeManager2.updateNode('type-field', { value: 'Plugin', completed: true });

treeManager2.navigateTo('addons-field');
treeManager2.updateNode('addons-field', { value: ['shadcn'], completed: true });

treeManager2.navigateTo('style-field');

console.log('\nAfter user progression:');
printNode2(tree2.root);

// Check visibility for RecursiveGroupContainer
console.log('\n=== VISIBILITY CHECK ===');

function checkGroupVisibility(node: any, path = '') {
  console.log(`\n${path}${node.id} (${node.type}) "${node.label || 'NONE'}"`);

  if (node.type === 'group') {
    if (!node.children || node.children.length === 0) {
      console.log(`  Empty group - would show label: ${!!node.label}`);
      return;
    }

    // Check which children are visible
    const visibleChildren = node.children.filter((child: any) => {
      if (child.active || child.completed) return true;

      if (node.flow === 'progressive') {
        const siblings = node.children;
        const childIndex = siblings.indexOf(child);
        const allPreviousCompleted = siblings.slice(0, childIndex).every((prev: any) => prev.completed);
        return allPreviousCompleted;
      }

      return false;
    });

    console.log(`  Visible children: ${visibleChildren.length}/${node.children.length}`);
    console.log(`  Would show label: ${!!node.label && visibleChildren.length > 0}`);

    visibleChildren.forEach((child: any) => {
      checkGroupVisibility(child, path + '  ');
    });
  }
}

checkGroupVisibility(tree2.root);

console.log('\n🔍 Analysis complete!');