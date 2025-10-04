// Test proper navigation history building for back navigation
// Run with: npx tsx src/tests/navigation-history-fix-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔄 Testing Navigation History Building for Back Navigation...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logNavigationState(step: string) {
  const history = treeManager.getNavigationPath();
  const activeNode = treeManager.getActiveNode();
  const canGoBack = treeManager.canGoBack();

  console.log(`\n📍 ${step}:`);
  console.log(`  Navigation history: [${history.map(n => n.id).join(' -> ')}]`);
  console.log(`  Active node: ${activeNode?.id || 'none'}`);
  console.log(`  Can go back: ${canGoBack}`);
  console.log(`  History length: ${history.length}`);
}

console.log('Step 1: Setting up test scenario...');

// Create a simple flow
const field1 = {
  type: 'text',
  id: 'field1',
  label: 'First field',
  depth: 0
};
adapter.addPromptRequestToTree(field1);

const field2 = {
  type: 'text',
  id: 'field2',
  label: 'Second field',
  depth: 0
};
adapter.addPromptRequestToTree(field2);

console.log('✓ Created 2 fields');

logNavigationState('Initial state');

console.log('\n=== TESTING PROPER NAVIGATION FLOW ===');

// The key insight: we need to establish a navigation flow
// In a real app, the user would start somewhere and then navigate forward

console.log('\nScenario 1: Navigate to first field, complete it, then navigate to second');

// Navigate to first field
treeManager.navigateTo('field1');
logNavigationState('After navigating to field1');

// Complete first field
treeManager.updateNode('field1', { value: 'value1', completed: true });
logNavigationState('After completing field1');

// Navigate to second field
treeManager.navigateTo('field2');
logNavigationState('After navigating to field2');

// NOW we should be able to go back
console.log('\nTesting back navigation from field2 to field1...');
const canGoBackNow = treeManager.canGoBack();
console.log(`Can go back now: ${canGoBackNow}`);

if (canGoBackNow) {
  const backResult = treeManager.goBack();
  console.log(`Back navigation result: ${backResult.success ? 'SUCCESS' : 'FAILED'} -> ${backResult.node?.id}`);
  logNavigationState('After back navigation');
} else {
  console.log('❌ Still cannot go back - navigation history issue');
}

console.log('\n=== TESTING THE REAL WORLD SCENARIO ===');

// Reset for the real scenario
const treeManager2 = new PromptTreeManager();
const adapter2 = new PromptTreeAdapter(treeManager2);

// Add the same field setup as the user's issue
const groupRequest = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};
adapter2.addPromptRequestToTree(groupRequest);

const locationField = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};
adapter2.addPromptRequestToTree(locationField, 'group1');

const nameField = {
  type: 'text',
  id: 'name-field',
  label: 'What should it be called?',
  depth: 1
};
adapter2.addPromptRequestToTree(nameField, 'group1');

console.log('\nSimulating user flow:');

// 1. Start at root/beginning
console.log('\n1. User starts the form...');
treeManager2.navigateTo('root');
logNavigationState('Started at root');

// 2. Navigate to first field
console.log('\n2. User navigates to location field...');
treeManager2.navigateTo('location-field');
logNavigationState('At location field');

// 3. Complete field
console.log('\n3. User completes location field...');
treeManager2.updateNode('location-field', { value: './my-plugin', completed: true });
logNavigationState('Completed location field');

// 4. Navigate to next field
console.log('\n4. User navigates to name field...');
treeManager2.navigateTo('name-field');
logNavigationState('At name field');

// 5. Now try to go back
console.log('\n5. User wants to go back...');
const canGoBackFromName = treeManager2.canGoBack();
console.log(`Can go back from name field: ${canGoBackFromName}`);

if (canGoBackFromName) {
  const backResult = treeManager2.goBack();
  console.log(`Back result: ${backResult.success ? 'SUCCESS' : 'FAILED'} -> ${backResult.node?.id}`);
  logNavigationState('After going back to location field');

  // Check the state after going back
  const locationNode = treeManager2.getNode('location-field');
  console.log(`Location field after back: completed=${locationNode?.completed}, active=${locationNode?.active}`);
} else {
  console.log('❌ Cannot go back - this is the root cause of the accumulation issue!');
}

console.log('\n=== ANALYSIS ===');

console.log('\n🔍 Key findings:');
console.log('1. Back navigation requires at least 2 items in navigation history');
console.log('2. The navigation history must be built by actual navigation calls');
console.log('3. In the real app, navigation history might not be built correctly');

console.log('\n💡 Potential fixes:');
console.log('1. Ensure the app navigates to an initial state before navigating to fields');
console.log('2. Add root/start state to navigation history when form begins');
console.log('3. Check if the real app is calling navigateTo() properly');
console.log('4. Verify that navigation history is preserved between field completions');

console.log('\n🎉 Navigation history test completed!');