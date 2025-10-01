// Test repeated forward/back navigation cycles
// Run with: npx tsx src/tests/repeated-navigation-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔄 Testing Repeated Forward/Back Navigation Cycles...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

console.log('Step 1: Creating test fields...');

const fields = [
  { type: 'text', id: 'field1', label: 'Field 1' },
  { type: 'text', id: 'field2', label: 'Field 2' },
  { type: 'text', id: 'field3', label: 'Field 3' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));
console.log('✓ Created 3 test fields');

function logCurrentState(step: string) {
  console.log(`\n${step}:`);
  const allNodes = treeManager.findNodes(node => node.type === 'field');
  allNodes.forEach(node => {
    const active = node.active ? ' [ACTIVE]' : '';
    const visited = node.visited ? ' [VISITED]' : '';
    console.log(`  ${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"${active}${visited}`);
  });

  const history = treeManager.getNavigationPath();
  console.log(`  Navigation history: [${history.map(n => n.id).join(' -> ')}]`);
}

console.log('\n=== FIRST CYCLE: Forward -> Back ===');

console.log('\nStep 2a: First forward navigation...');
treeManager.navigateTo('field1');
treeManager.updateNode('field1', { value: 'Value 1', completed: true });
logCurrentState('After completing field1');

treeManager.navigateTo('field2');
treeManager.updateNode('field2', { value: 'Value 2', completed: true });
logCurrentState('After completing field2');

console.log('\nStep 2b: First back navigation...');
const backResult1 = treeManager.goBack();
console.log(`Back navigation 1: ${backResult1.success ? 'SUCCESS' : 'FAILED'} -> ${backResult1.node?.id}`);
logCurrentState('After first back navigation');

console.log('\n=== SECOND CYCLE: Forward -> Back ===');

console.log('\nStep 3a: Second forward navigation...');
// User goes forward again (re-completing field2)
treeManager.navigateTo('field2');
treeManager.updateNode('field2', { value: 'Value 2 Updated', completed: true });
logCurrentState('After re-completing field2');

// Continue to field3
treeManager.navigateTo('field3');
treeManager.updateNode('field3', { value: 'Value 3', completed: true });
logCurrentState('After completing field3');

console.log('\nStep 3b: Second back navigation (THE PROBLEM CASE)...');
const backResult2 = treeManager.goBack();
console.log(`Back navigation 2: ${backResult2.success ? 'SUCCESS' : 'FAILED'} -> ${backResult2.node?.id}`);
logCurrentState('After second back navigation');

console.log('\nStep 4: Analysis...');

const field2Node = treeManager.getNode('field2');
const field3Node = treeManager.getNode('field3');

console.log('\nExpected behavior on second back navigation:');
console.log('  - field2: should have completed=false (going back to it)');
console.log('  - field3: should have completed=false (leaving it)');

console.log('\nActual results:');
console.log(`  - field2: completed=${field2Node?.completed}`);
console.log(`  - field3: completed=${field3Node?.completed}`);

const isCorrect = !field2Node?.completed && !field3Node?.completed;
console.log(`\n${isCorrect ? '✅' : '❌'} Second back navigation ${isCorrect ? 'correctly' : 'incorrectly'} cleared completed states`);

if (!isCorrect) {
  console.log('\n🔍 Debugging the issue...');

  console.log('\nLet\'s trace what happens in goBack():');
  console.log('1. Current node (field3) should be reset -> ✓');
  console.log('2. Previous node (field2) should have completed=false -> ?');

  // Check navigation history
  const history = treeManager.getNavigationPath();
  console.log('\nNavigation history analysis:');
  history.forEach((node, index) => {
    console.log(`  ${index}: ${node.id} (completed: ${node.completed})`);
  });

  console.log('\n💡 Possible issues:');
  console.log('   - Navigation history might be corrupted');
  console.log('   - resetNodeAndDescendants might not be working correctly');
  console.log('   - The "previous node" detection might be wrong');
}

console.log('\n🎉 Repeated navigation test completed!');

// Additional debugging - let's try one more back navigation
console.log('\n=== ADDITIONAL TEST: Third back navigation ===');
const backResult3 = treeManager.goBack();
console.log(`Back navigation 3: ${backResult3.success ? 'SUCCESS' : 'FAILED'} -> ${backResult3.node?.id}`);
logCurrentState('After third back navigation');

const field1Node = treeManager.getNode('field1');
console.log(`\nField1 after third back: completed=${field1Node?.completed} (should be false)`);
console.log(`Field1 is ${field1Node?.completed ? '❌ incorrectly' : '✅ correctly'} handled`);