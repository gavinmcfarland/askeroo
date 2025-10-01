// Test the specific legacy sync issue with repeated navigation
// Run with: npx tsx src/tests/legacy-sync-issue-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🐛 Testing Legacy Sync Issue with Repeated Navigation...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Simulate the legacy completed fields state
let legacyCompletedFields = new Set<string>();

// Helper function to simulate the synchronization logic from PromptApp
function simulateLegacySync() {
  console.log('Running legacy sync...');
  const allNodes = treeManager.findNodes(() => true);
  const noLongerCompleted: string[] = [];

  allNodes.forEach(node => {
    if (!node.completed && legacyCompletedFields.has(node.id)) {
      console.log(`  - Found ${node.id} is no longer completed, removing from legacy set`);
      noLongerCompleted.push(node.id);
    }
  });

  // Update legacy set
  noLongerCompleted.forEach(id => legacyCompletedFields.delete(id));

  console.log(`  Legacy completed after sync: [${Array.from(legacyCompletedFields).join(', ')}]`);
  return noLongerCompleted;
}

// Helper to simulate legacy field completion (what happens in real app)
function simulateLegacyFieldCompletion(fieldId: string, value: string) {
  // Tree update
  treeManager.updateNode(fieldId, { value, completed: true });

  // Legacy state update
  legacyCompletedFields.add(fieldId);

  console.log(`Completed ${fieldId}: tree=${treeManager.getNode(fieldId)?.completed}, legacy=${legacyCompletedFields.has(fieldId)}`);
}

function logState(step: string) {
  console.log(`\n--- ${step} ---`);
  const allNodes = treeManager.findNodes(node => node.type === 'field');

  console.log('Tree state:');
  allNodes.forEach(node => {
    const active = node.active ? ' [ACTIVE]' : '';
    console.log(`  ${node.id}: completed=${node.completed}${active}`);
  });

  console.log(`Legacy state: [${Array.from(legacyCompletedFields).join(', ')}]`);

  // Check for mismatches
  const mismatches: string[] = [];
  allNodes.forEach(node => {
    if (node.type === 'field') {
      const treeCompleted = node.completed;
      const legacyCompleted = legacyCompletedFields.has(node.id);
      if (treeCompleted !== legacyCompleted) {
        mismatches.push(`${node.id}(tree:${treeCompleted}, legacy:${legacyCompleted})`);
      }
    }
  });

  if (mismatches.length > 0) {
    console.log(`❌ MISMATCH: ${mismatches.join(', ')}`);
  } else {
    console.log('✅ Tree and legacy state match');
  }
}

console.log('Step 1: Creating test fields...');
const fields = [
  { type: 'text', id: 'field1', label: 'Field 1' },
  { type: 'text', id: 'field2', label: 'Field 2' },
  { type: 'text', id: 'field3', label: 'Field 3' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));

console.log('\n=== REPRODUCING THE ISSUE ===');

// CYCLE 1: Forward navigation
console.log('\nCycle 1: Forward navigation');
treeManager.navigateTo('field1');
simulateLegacyFieldCompletion('field1', 'Value 1');

treeManager.navigateTo('field2');
simulateLegacyFieldCompletion('field2', 'Value 2');

logState('After completing field1 and field2');

// CYCLE 1: Back navigation
console.log('\nCycle 1: Back navigation');
const back1 = treeManager.goBack();
console.log(`Back navigation to: ${back1.node?.id}`);
simulateLegacySync();
logState('After first back navigation');

// CYCLE 2: Forward navigation again
console.log('\nCycle 2: Forward navigation again');
treeManager.navigateTo('field2');
simulateLegacyFieldCompletion('field2', 'Value 2 Updated');

treeManager.navigateTo('field3');
simulateLegacyFieldCompletion('field3', 'Value 3');

logState('After re-completing field2 and completing field3');

// CYCLE 2: Back navigation (THE PROBLEM)
console.log('\nCycle 2: Back navigation (THE PROBLEM CASE)');
const back2 = treeManager.goBack();
console.log(`Back navigation to: ${back2.node?.id}`);

// This is where the issue might be
console.log('\nBefore legacy sync:');
logState('Before sync');

const removedFromLegacy = simulateLegacySync();
console.log(`Removed from legacy: [${removedFromLegacy.join(', ')}]`);

logState('After second back navigation + sync');

// Let's check what the real issue might be
console.log('\n=== DEBUGGING THE SPECIFIC ISSUE ===');

const field2Node = treeManager.getNode('field2');
const field3Node = treeManager.getNode('field3');

console.log('\nDetailed analysis:');
console.log(`field2: tree.completed=${field2Node?.completed}, legacy.has=${legacyCompletedFields.has('field2')}`);
console.log(`field3: tree.completed=${field3Node?.completed}, legacy.has=${legacyCompletedFields.has('field3')}`);

// Test one more back navigation
console.log('\n=== TESTING THIRD BACK NAVIGATION ===');
const back3 = treeManager.goBack();
console.log(`Third back navigation to: ${back3.node?.id}`);
simulateLegacySync();
logState('After third back navigation');

console.log('\n💡 Analysis complete!');

// Summary
const finalTreeCompleted = treeManager.findNodes(node => node.type === 'field' && node.completed);
const finalLegacySize = legacyCompletedFields.size;

console.log('\nFinal summary:');
console.log(`Tree completed fields: ${finalTreeCompleted.length}`);
console.log(`Legacy completed fields: ${finalLegacySize}`);
console.log(`Are they synchronized? ${finalTreeCompleted.length === finalLegacySize ? '✅' : '❌'}`);

if (finalTreeCompleted.length !== finalLegacySize) {
  console.log('\n🔍 The issue is likely:');
  console.log('1. Legacy state synchronization timing');
  console.log('2. Race condition between tree updates and legacy updates');
  console.log('3. Missing sync calls in specific navigation paths');
}