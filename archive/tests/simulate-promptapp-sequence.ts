// Simulate the exact sequence that happens in PromptApp
// Run with: npx tsx src/tests/simulate-promptapp-sequence.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🎯 Simulating PromptApp Sequence for Group Labels...\n');

// Create tree manager and adapter like PromptApp
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logTreeAndCurrentGroup(step: string) {
  console.log(`\n--- ${step} ---`);
  const currentGroup = adapter.getCurrentGroup();
  const activeNode = treeManager.getActiveNode();

  console.log(`Current group: ${currentGroup}`);
  console.log(`Active node: ${activeNode?.id || 'none'} (${activeNode?.type || 'none'})`);

  // Print tree structure
  const tree = treeManager.getTree();
  function printNode(node: any, indent = '') {
    const status = node.active ? '🟢' : node.completed ? '✅' : '⚪';
    console.log(`${indent}${node.id} (${node.type}) ${status} "${node.label || 'NONE'}" depth=${node.depth}`);
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        printNode(child, indent + '  ');
      });
    }
  }
  printNode(tree.root);
}

// Simulate the exact PromptApp sequence
console.log('Simulating how groups are added in PromptApp...');

// Step 1: Add Group 1 (this happens first)
console.log('\n1. Adding Group 1...');
const group1Request = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};

let currentGroup = adapter.getCurrentGroup();
adapter.addPromptRequestToTree(group1Request, currentGroup);
logTreeAndCurrentGroup('After adding Group 1');

// Step 2: Add first field to Group 1
console.log('\n2. Adding location-field to Group 1...');
const locationField = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};

currentGroup = adapter.getCurrentGroup();
console.log(`getCurrentGroup() returns: ${currentGroup}`);
adapter.addPromptRequestToTree(locationField, currentGroup);

// Activate the field (like PromptApp does)
treeManager.navigateTo('location-field');
logTreeAndCurrentGroup('After adding and activating location-field');

// Step 3: Add more fields to Group 1
console.log('\n3. Adding more fields to Group 1...');
const typeField = {
  type: 'select',
  id: 'type-field',
  label: 'Choose a type:',
  depth: 1
};

currentGroup = adapter.getCurrentGroup();
console.log(`getCurrentGroup() returns: ${currentGroup}`);
adapter.addPromptRequestToTree(typeField, currentGroup);
logTreeAndCurrentGroup('After adding type-field');

// Step 4: Complete some fields and progress
console.log('\n4. User completes location-field...');
treeManager.updateNode('location-field', { value: './my-plugin', completed: true });
treeManager.navigateTo('type-field');
logTreeAndCurrentGroup('After completing location-field and navigating to type-field');

// Step 5: **CRITICAL MOMENT** - Add Group 2 while type-field is active
console.log('\n5. 🎯 CRITICAL: Adding Group 2 while type-field is active...');
const group2Request = {
  type: 'group',
  id: 'group2',
  label: 'Group 2',
  flow: 'progressive' as const,
  depth: 1
};

currentGroup = adapter.getCurrentGroup();
console.log(`getCurrentGroup() returns: ${currentGroup} (should be 'group1')`);
console.log(`Active node: ${treeManager.getActiveNode()?.id} (should be 'type-field')`);

adapter.addPromptRequestToTree(group2Request, currentGroup);
logTreeAndCurrentGroup('After adding Group 2');

// Step 6: Add fields to Group 2
console.log('\n6. Adding fields to Group 2...');
const addonsField = {
  type: 'multi',
  id: 'addons-field',
  label: 'Choose addons:',
  depth: 2
};

// When adding to Group 2, getCurrentGroup should return the parent of active node
// But we want to add to group2, so we need to pass 'group2' explicitly
console.log('Adding addons-field - getCurrentGroup():', adapter.getCurrentGroup());
adapter.addPromptRequestToTree(addonsField, 'group2'); // Explicit parent

const styleField = {
  type: 'select',
  id: 'style-field',
  label: 'Choose a style:',
  depth: 2
};

adapter.addPromptRequestToTree(styleField, 'group2'); // Explicit parent
logTreeAndCurrentGroup('After adding fields to Group 2');

// Step 7: Progress through the flow
console.log('\n7. User progresses through the flow...');
treeManager.updateNode('type-field', { value: 'Plugin', completed: true });
treeManager.navigateTo('addons-field');
treeManager.updateNode('addons-field', { value: ['shadcn'], completed: true });
treeManager.navigateTo('style-field');
logTreeAndCurrentGroup('Final state - user at style-field');

console.log('\n=== ANALYSIS ===');

// Check if Group 2 is properly nested
const group1Node = treeManager.getNode('group1');
const group2Node = treeManager.getNode('group2');

console.log('\nGroup structure analysis:');
console.log(`Group 1 exists: ${!!group1Node}`);
console.log(`Group 1 children: ${group1Node?.children?.length || 0}`);
if (group1Node?.children) {
  console.log('Group 1 children:', group1Node.children.map(c => `${c.id} (${c.type})`));
}

console.log(`Group 2 exists: ${!!group2Node}`);
console.log(`Group 2 parent: ${group2Node?.parent?.id || 'NONE'}`);
console.log(`Group 2 children: ${group2Node?.children?.length || 0}`);

if (group2Node?.parent?.id === 'group1') {
  console.log('✅ Group 2 is correctly nested under Group 1');
} else {
  console.log('❌ Group 2 is NOT properly nested under Group 1');
  console.log(`   Expected parent: group1, Actual parent: ${group2Node?.parent?.id}`);
}

console.log('\n🎯 Simulation completed!');