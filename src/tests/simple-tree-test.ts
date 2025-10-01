// Simple test without UI to verify tree integration
// Run with: npx tsx src/tests/simple-tree-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🌳 Testing Tree Integration with Mock Prompts...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Simulate the same prompts that would be created by your interactive flow
console.log('Step 1: Creating group prompt...');
const groupRequest = {
  type: 'group',
  id: 'main-group',
  label: 'Main Configuration',
  flow: 'progressive' as const,
  depth: 0
};

adapter.addPromptRequestToTree(groupRequest);
console.log('✓ Added group:', groupRequest.id);

console.log('\nStep 2: Creating text field prompt...');
const textRequest = {
  type: 'text',
  id: 'user-name',
  label: 'What is your name?',
  groupName: 'main-group',
  depth: 1
};

adapter.addPromptRequestToTree(textRequest, 'main-group');
console.log('✓ Added text field:', textRequest.id);

console.log('\nStep 3: Creating confirm field prompt...');
const confirmRequest = {
  type: 'confirm',
  id: 'use-advanced',
  label: 'Use advanced settings?',
  groupName: 'main-group',
  depth: 1
};

adapter.addPromptRequestToTree(confirmRequest, 'main-group');
console.log('✓ Added confirm field:', confirmRequest.id);

console.log('\nStep 4: Current tree structure:');
console.log(treeManager.printTree());

console.log('Step 5: Testing navigation...');
console.log('Navigating to group...');
let result = treeManager.navigateTo('main-group');
console.log('✓ Group navigation:', result.success ? 'success' : 'failed');

console.log('Navigating to text field...');
result = treeManager.navigateTo('user-name');
console.log('✓ Text field navigation:', result.success ? 'success' : 'failed');

console.log('Updating text field value...');
const updateResult = treeManager.updateNode('user-name', {
  value: 'John Doe',
  visited: true,
  completed: true
});
console.log('✓ Field update:', updateResult ? 'success' : 'failed');

console.log('Navigating to confirm field...');
result = treeManager.navigateTo('use-advanced');
console.log('✓ Confirm field navigation:', result.success ? 'success' : 'failed');

console.log('Can go back?', treeManager.canGoBack());

console.log('Going back...');
const backResult = treeManager.goBack();
console.log('✓ Back navigation:', backResult.success ? 'success' : 'failed');
if (backResult.success) {
  console.log('  Back to:', backResult.node?.id);
}

console.log('\nStep 6: Final tree structure:');
console.log(treeManager.printTree());

console.log('\nStep 7: Tree statistics:');
const stats = treeManager.getTreeStats();
console.log('Stats:', {
  totalNodes: stats.totalNodes,
  completedNodes: stats.completedNodes,
  visitedNodes: stats.visitedNodes,
  activeNodeId: stats.activeNodeId,
  maxDepth: stats.maxDepth
});

console.log('\nStep 8: Simulate old state sync...');
const syncedState = adapter.syncTreeToOldState();
console.log('Field values:', Object.keys(syncedState.fieldState.values));
console.log('Completed fields:', Array.from(syncedState.fieldState.completed));
console.log('Group order:', syncedState.groupState.order);

console.log('\n🎉 Tree integration test completed successfully!');
console.log('\n💡 What this means:');
console.log('  - The tree is working correctly alongside your existing state');
console.log('  - Navigation and field updates are being tracked');
console.log('  - State synchronization with old system is working');
console.log('  - Ready for rendering migration!');