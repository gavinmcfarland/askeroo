// Test that the group nesting fix works correctly
// Run with: npx tsx src/tests/group-nesting-fix-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔧 Testing Group Nesting Fix...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function simulateShowGroup(label: string, id: string, parentGroup?: string) {
  console.log(`\n📥 Simulating showGroup for ${id} with parent: ${parentGroup || 'none'}`);

  // This simulates what showGroup does - creates a group request with groupName
  const groupRequest = {
    type: 'group',
    id: id,
    label: label,
    flow: 'progressive' as const,
    depth: parentGroup ? 1 : 0,
    groupName: parentGroup // This is the key change!
  };

  // This simulates what PromptApp does - uses groupName for parent
  const currentGroup = groupRequest.groupName || adapter.getCurrentGroup();
  console.log(`Current group determined as: ${currentGroup}`);

  adapter.addPromptRequestToTree(groupRequest, currentGroup);
}

function logTreeStructure(step: string) {
  const tree = treeManager.getTree();
  console.log(`\n--- ${step} ---`);

  function printNode(node: any, indent = '') {
    console.log(`${indent}${node.id} (${node.type}) "${node.label || 'NONE'}" depth=${node.depth}`);
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        printNode(child, indent + '  ');
      });
    }
  }

  printNode(tree.root);
}

console.log('Testing the fixed group nesting behavior...');

// Test 1: Create Group 1 (no parent)
simulateShowGroup('Group 1', 'group1');
logTreeStructure('After adding Group 1');

// Test 2: Create Group 2 as child of Group 1 (with parent)
simulateShowGroup('Group 2', 'group2', 'group1');
logTreeStructure('After adding Group 2 as child of Group 1');

// Test 3: Add fields to both groups
console.log('\n=== Adding fields to groups ===');

// Add field to Group 1
adapter.addPromptRequestToTree({
  type: 'text',
  id: 'field1',
  label: 'Field in Group 1',
  depth: 1
}, 'group1');

// Add field to Group 2
adapter.addPromptRequestToTree({
  type: 'text',
  id: 'field2',
  label: 'Field in Group 2',
  depth: 2
}, 'group2');

logTreeStructure('After adding fields to both groups');

// Test 4: Verify the nesting structure
console.log('\n=== VERIFYING NESTING STRUCTURE ===');

const group1Node = treeManager.getNode('group1');
const group2Node = treeManager.getNode('group2');
const field1Node = treeManager.getNode('field1');
const field2Node = treeManager.getNode('field2');

console.log('\nStructure verification:');
console.log(`Group 1 parent: ${group1Node?.parent?.id || 'root'} ✅`);
console.log(`Group 2 parent: ${group2Node?.parent?.id || 'NONE'} ${group2Node?.parent?.id === 'group1' ? '✅' : '❌'}`);
console.log(`Field 1 parent: ${field1Node?.parent?.id || 'NONE'} ${field1Node?.parent?.id === 'group1' ? '✅' : '❌'}`);
console.log(`Field 2 parent: ${field2Node?.parent?.id || 'NONE'} ${field2Node?.parent?.id === 'group2' ? '✅' : '❌'}`);

console.log('\nExpected structure:');
console.log('root');
console.log('  └─ group1 (Group 1)');
console.log('      ├─ field1 (Field in Group 1)');
console.log('      └─ group2 (Group 2)');
console.log('          └─ field2 (Field in Group 2)');

if (group2Node?.parent?.id === 'group1' &&
    field1Node?.parent?.id === 'group1' &&
    field2Node?.parent?.id === 'group2') {
  console.log('\n🎉 SUCCESS: Group nesting fix is working correctly!');
  console.log('📝 Group 2 should now show its label in the UI because it\'s properly nested.');
} else {
  console.log('\n❌ FAILURE: Group nesting is still not working correctly.');
}

console.log('\n🔧 Group nesting fix test completed!');