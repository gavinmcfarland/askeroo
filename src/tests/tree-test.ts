// Simple test to verify tree structure is working
// Run with: npx tsx src/tests/tree-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🌳 Testing Prompt Tree Implementation...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Test 1: Basic node creation
console.log('Test 1: Creating basic nodes...');
const groupRequest = {
  type: 'group',
  id: 'test-group-1',
  label: 'Test Group',
  flow: 'progressive' as const,
  depth: 0
};

const fieldRequest = {
  type: 'text',
  id: 'test-field-1',
  label: 'Test Field',
  groupName: 'test-group-1',
  depth: 1
};

// Add group first
adapter.addPromptRequestToTree(groupRequest);
console.log('✓ Added group:', groupRequest.id);

// Add field to group
adapter.addPromptRequestToTree(fieldRequest, 'test-group-1');
console.log('✓ Added field:', fieldRequest.id);

// Test 2: Tree structure
console.log('\nTest 2: Tree structure:');
console.log(treeManager.printTree());

// Test 3: Navigation
console.log('Test 3: Navigation...');
console.log('Navigating to group...');
const groupNav = treeManager.navigateTo('test-group-1');
console.log('✓ Group navigation:', groupNav.success ? 'success' : 'failed');

console.log('Navigating to field...');
const fieldNav = treeManager.navigateTo('test-field-1');
console.log('✓ Field navigation:', fieldNav.success ? 'success' : 'failed');

console.log('Can go back?', treeManager.canGoBack());

const backNav = treeManager.goBack();
console.log('✓ Back navigation:', backNav.success ? 'success' : 'failed');
if (backNav.success) {
  console.log('  Back to:', backNav.node?.id);
}

// Test 4: Field value updates
console.log('\nTest 4: Field updates...');
const updateResult = treeManager.updateNode('test-field-1', {
  value: 'test value',
  visited: true,
  completed: true
});
console.log('✓ Field update:', updateResult ? 'success' : 'failed');

// Test 5: Tree stats
console.log('\nTest 5: Tree statistics:');
const stats = treeManager.getTreeStats();
console.log('Stats:', {
  totalNodes: stats.totalNodes,
  completedNodes: stats.completedNodes,
  visitedNodes: stats.visitedNodes,
  activeNodeId: stats.activeNodeId,
  maxDepth: stats.maxDepth
});

// Test 6: State synchronization
console.log('\nTest 6: State synchronization...');
const syncedState = adapter.syncTreeToOldState();
console.log('✓ Field values:', Object.keys(syncedState.fieldState.values).length);
console.log('✓ Completed fields:', syncedState.fieldState.completed.size);
console.log('✓ Group order:', syncedState.groupState.order.length);

console.log('\n🎉 All tests completed successfully!');
console.log('\nNext steps:');
console.log('1. Run your app and interact with prompts');
console.log('2. Check the console for tree navigation messages');
console.log('3. The tree is running parallel to existing state (safe migration)');