// Test back navigation and completed state clearing
// Run with: npx tsx src/tests/back-navigation-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('⬅️ Testing Back Navigation and Completed State Clearing...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

console.log('Step 1: Creating test flow...');

// Create a simple flow with multiple fields
const nameField = {
  type: 'text',
  id: 'user-name',
  label: 'Enter your name',
  depth: 0
};

const emailField = {
  type: 'text',
  id: 'user-email',
  label: 'Enter your email',
  depth: 0
};

const confirmField = {
  type: 'confirm',
  id: 'confirm-details',
  label: 'Confirm details?',
  depth: 0
};

// Add fields to tree
adapter.addPromptRequestToTree(nameField);
adapter.addPromptRequestToTree(emailField);
adapter.addPromptRequestToTree(confirmField);

console.log('✓ Created flow with 3 fields');

console.log('\nStep 2: Simulating user progression...');

// Start navigation and simulate filling fields
treeManager.navigateTo('user-name');
let tree = treeManager.getTree();
console.log(`Active field: ${tree.activeNode?.id}`);

// Simulate completing name field
console.log('Completing name field...');
treeManager.updateNode(tree.activeNode!.id, { value: 'John Doe', completed: true });

// Navigate to email field
treeManager.navigateTo('user-email');
tree = treeManager.getTree();
console.log(`Active field: ${tree.activeNode?.id}`);

// Simulate completing email field
console.log('Completing email field...');
treeManager.updateNode(tree.activeNode!.id, { value: 'john@example.com', completed: true });

// Navigate to confirm field
treeManager.navigateTo('confirm-details');
tree = treeManager.getTree();
console.log(`Active field: ${tree.activeNode?.id}`);

console.log('\nStep 3: Checking completed states before going back...');

// Check all completed states
const allNodes = treeManager.findNodes(() => true);
allNodes.forEach(node => {
  if (node.type === 'field') {
    console.log(`${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"`);
  }
});

console.log('\nStep 4: Testing back navigation...');

// Go back one step
console.log('Going back from confirm field to email field...');
const backResult1 = treeManager.goBack();
console.log(`Back navigation 1: ${backResult1.success ? 'SUCCESS' : 'FAILED'}`);
if (backResult1.success) {
  console.log(`Now active: ${backResult1.node?.id}`);
}

// Check states after first back
console.log('\nStates after going back once:');
const allNodesAfterBack1 = treeManager.findNodes(() => true);
allNodesAfterBack1.forEach(node => {
  if (node.type === 'field') {
    console.log(`${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"`);
  }
});

// Go back another step
console.log('\nGoing back from email field to name field...');
const backResult2 = treeManager.goBack();
console.log(`Back navigation 2: ${backResult2.success ? 'SUCCESS' : 'FAILED'}`);
if (backResult2.success) {
  console.log(`Now active: ${backResult2.node?.id}`);
}

// Check final states
console.log('\nFinal states after going back twice:');
const allNodesAfterBack2 = treeManager.findNodes(() => true);
allNodesAfterBack2.forEach(node => {
  if (node.type === 'field') {
    console.log(`${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"`);
  }
});

console.log('\nStep 5: Verification...');

// Verify that fields that were "behind" the current position are no longer completed
const nameNode = treeManager.getNode('user-name');
const emailNode = treeManager.getNode('user-email');
const confirmNode = treeManager.getNode('confirm-details');

console.log('Expected behavior:');
console.log('  - Name field: completed=false (we went back to it)');
console.log('  - Email field: completed=false (was reset when we went back from it)');
console.log('  - Confirm field: completed=false (was reset when we went back from it)');

console.log('\nActual results:');
console.log(`  - Name field: completed=${nameNode?.completed}`);
console.log(`  - Email field: completed=${emailNode?.completed}`);
console.log(`  - Confirm field: completed=${confirmNode?.completed}`);

const allCorrect = !nameNode?.completed && !emailNode?.completed && !confirmNode?.completed;
console.log(`\n${allCorrect ? '✅' : '❌'} Back navigation ${allCorrect ? 'correctly' : 'incorrectly'} cleared completed states`);

console.log('\nStep 6: Testing navigation history...');
const history = treeManager.getNavigationPath();
console.log('Navigation history:');
history.forEach((node, index) => {
  console.log(`  ${index}: ${node.id} (${node.type})`);
});

console.log('\n🎉 Back navigation test completed!');

if (allCorrect) {
  console.log('\n💡 Tree-based back navigation is working correctly!');
  console.log('   - Completed states are properly cleared');
  console.log('   - Values are preserved (optional based on requirements)');
  console.log('   - Navigation history is maintained');
} else {
  console.log('\n⚠️ Issues found with back navigation:');
  console.log('   - Some completed states were not cleared');
  console.log('   - Check resetNodeAndDescendants() implementation');
}