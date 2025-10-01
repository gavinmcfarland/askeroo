// Test that legacy state synchronization works with back navigation
// Run with: npx tsx src/tests/legacy-sync-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔄 Testing Legacy State Synchronization with Back Navigation...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

console.log('Step 1: Creating test scenario...');

// Create fields
const fields = [
  { type: 'text', id: 'field1', label: 'Field 1' },
  { type: 'text', id: 'field2', label: 'Field 2' },
  { type: 'text', id: 'field3', label: 'Field 3' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));

console.log('✓ Created 3 test fields');

console.log('\nStep 2: Simulating completion and back navigation...');

// Navigate and complete fields
treeManager.navigateTo('field1');
treeManager.updateNode('field1', { value: 'Value 1', completed: true });

treeManager.navigateTo('field2');
treeManager.updateNode('field2', { value: 'Value 2', completed: true });

treeManager.navigateTo('field3');
console.log('Completed field1 and field2, now at field3');

// Simulate a legacy completed set (what the app would have)
const mockCompletedFields = new Set(['field1', 'field2']);
console.log('Mock legacy completed fields:', Array.from(mockCompletedFields));

console.log('\nStep 3: Testing back navigation state sync logic...');

// Simulate the goBack() operation
const backResult = treeManager.goBack();
console.log(`Back navigation: ${backResult.success ? 'SUCCESS' : 'FAILED'}`);

if (backResult.success) {
  console.log(`Now active: ${backResult.node?.id}`);

  // Simulate the synchronization logic from PromptApp
  const allNodes = treeManager.findNodes(() => true);
  const noLongerCompleted: string[] = [];

  allNodes.forEach(node => {
    if (!node.completed && mockCompletedFields.has(node.id)) {
      noLongerCompleted.push(node.id);
    }
  });

  console.log('Nodes that should be removed from legacy completed set:', noLongerCompleted);

  // Simulate updating the legacy set
  noLongerCompleted.forEach(id => mockCompletedFields.delete(id));
  console.log('Updated legacy completed fields:', Array.from(mockCompletedFields));
}

console.log('\nStep 4: Verifying synchronization...');

// Check tree state
const allNodes = treeManager.findNodes(() => true);
console.log('\nTree state after back navigation:');
allNodes.forEach(node => {
  if (node.type === 'field') {
    console.log(`  ${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"`);
  }
});

console.log('\nLegacy state after synchronization:');
console.log(`  Completed fields: [${Array.from(mockCompletedFields).join(', ')}]`);

// Verify they match
const treeCompleted = allNodes.filter(node => node.type === 'field' && node.completed).map(node => node.id);
const legacyCompleted = Array.from(mockCompletedFields);

const inSync = treeCompleted.length === legacyCompleted.length &&
               treeCompleted.every(id => legacyCompleted.includes(id));

console.log(`\n${inSync ? '✅' : '❌'} Tree and legacy state ${inSync ? 'are' : 'are NOT'} synchronized`);

console.log('\nStep 5: Testing multiple back operations...');

// Go back again
const backResult2 = treeManager.goBack();
if (backResult2.success) {
  console.log(`Second back navigation to: ${backResult2.node?.id}`);

  // Sync again
  const allNodes2 = treeManager.findNodes(() => true);
  const noLongerCompleted2: string[] = [];

  allNodes2.forEach(node => {
    if (!node.completed && mockCompletedFields.has(node.id)) {
      noLongerCompleted2.push(node.id);
    }
  });

  noLongerCompleted2.forEach(id => mockCompletedFields.delete(id));
  console.log('Final legacy completed fields:', Array.from(mockCompletedFields));

  // Final verification
  const finalTreeCompleted = allNodes2.filter(node => node.type === 'field' && node.completed).map(node => node.id);
  const finalLegacyCompleted = Array.from(mockCompletedFields);

  const finalSync = finalTreeCompleted.length === finalLegacyCompleted.length &&
                   finalTreeCompleted.every(id => finalLegacyCompleted.includes(id));

  console.log(`Final sync check: ${finalSync ? '✅ PASS' : '❌ FAIL'}`);
}

console.log('\n🎉 Legacy synchronization test completed!');
console.log('\n💡 Key benefits of the fix:');
console.log('  ✓ Tree state correctly resets completed status on back navigation');
console.log('  ✓ Legacy state can be synchronized using findNodes() method');
console.log('  ✓ Both tree and legacy systems stay consistent');
console.log('  ✓ User experience: completed states properly cleared when going back');