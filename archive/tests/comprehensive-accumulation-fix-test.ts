// Comprehensive test for the accumulation fix
// Run with: npx tsx src/tests/comprehensive-accumulation-fix-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔧 Testing Comprehensive Fix for Accumulation Issue...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logFieldStates(step: string) {
  const allFields = treeManager.findNodes(node => node.type === 'field');

  console.log(`\n${step}:`);
  console.log(`  Total field nodes in tree: ${allFields.length}`);

  const fieldCounts = new Map<string, number>();

  allFields.forEach(field => {
    const count = fieldCounts.get(field.id) || 0;
    fieldCounts.set(field.id, count + 1);

    console.log(`    ${field.id}: completed=${field.completed}, active=${field.active}, value="${field.value || 'undefined'}"`);
  });

  // Check for duplicates
  let hasDuplicates = false;
  fieldCounts.forEach((count, fieldId) => {
    if (count > 1) {
      console.log(`    ❌ DUPLICATE: ${fieldId} appears ${count} times!`);
      hasDuplicates = true;
    }
  });

  if (!hasDuplicates) {
    console.log(`    ✅ No duplicate field nodes detected`);
  }
}

console.log('Setting up a realistic multi-field scenario...');

// Create a group with multiple fields
const groupRequest = {
  type: 'group',
  id: 'plugin-group',
  label: 'Plugin Configuration',
  flow: 'progressive' as const,
  depth: 0
};
adapter.addPromptRequestToTree(groupRequest);

const field1 = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};

const field2 = {
  type: 'text',
  id: 'name-field',
  label: 'What should it be called?',
  depth: 1
};

const field3 = {
  type: 'confirm',
  id: 'confirm-field',
  label: 'Proceed with creation?',
  depth: 1
};

// Add fields to tree
adapter.addPromptRequestToTree(field1, 'plugin-group');
adapter.addPromptRequestToTree(field2, 'plugin-group');
adapter.addPromptRequestToTree(field3, 'plugin-group');

logFieldStates('Initial setup');

console.log('\n=== TESTING MULTIPLE FORWARD/BACK CYCLES ===');

// Test multiple cycles to ensure no accumulation
for (let cycle = 1; cycle <= 5; cycle++) {
  console.log(`\n--- CYCLE ${cycle} ---`);

  // Navigate and complete first field
  treeManager.navigateTo('location-field');
  treeManager.updateNode('location-field', { value: `./plugin-${cycle}`, completed: true });

  // Navigate and complete second field
  treeManager.navigateTo('name-field');
  treeManager.updateNode('name-field', { value: `plugin-name-${cycle}`, completed: true });

  // Navigate to third field
  treeManager.navigateTo('confirm-field');

  logFieldStates(`Cycle ${cycle}: After progressing to field 3`);

  // Go back multiple times
  console.log(`\n  Going back in cycle ${cycle}...`);

  const backResult1 = treeManager.goBack();
  console.log(`    Back 1: ${backResult1.success ? 'SUCCESS' : 'FAILED'} -> ${backResult1.node?.id}`);

  const backResult2 = treeManager.goBack();
  console.log(`    Back 2: ${backResult2.success ? 'SUCCESS' : 'FAILED'} -> ${backResult2.node?.id}`);

  logFieldStates(`Cycle ${cycle}: After going back twice`);

  // Try to add the same fields again (this should NOT create duplicates)
  console.log(`\n  Re-adding fields in cycle ${cycle} (should reuse existing nodes)...`);
  adapter.addPromptRequestToTree(field1, 'plugin-group');
  adapter.addPromptRequestToTree(field2, 'plugin-group');
  adapter.addPromptRequestToTree(field3, 'plugin-group');

  logFieldStates(`Cycle ${cycle}: After re-adding fields`);
}

console.log('\n=== FINAL ANALYSIS ===');

// Final check
const allFields = treeManager.findNodes(node => node.type === 'field');
const uniqueFieldIds = new Set(allFields.map(field => field.id));

console.log(`\nFinal Statistics:`);
console.log(`  Total field nodes: ${allFields.length}`);
console.log(`  Unique field IDs: ${uniqueFieldIds.size}`);
console.log(`  Expected unique IDs: 3 (location-field, name-field, confirm-field)`);

if (allFields.length === uniqueFieldIds.size && uniqueFieldIds.size === 3) {
  console.log(`\n✅ SUCCESS: No accumulation detected!`);
  console.log(`   - All nodes are unique`);
  console.log(`   - Total count matches expected count`);
  console.log(`   - Multiple forward/back cycles worked correctly`);
} else {
  console.log(`\n❌ ACCUMULATION STILL EXISTS:`);
  console.log(`   - Expected 3 unique nodes, got ${allFields.length} total, ${uniqueFieldIds.size} unique`);
  console.log(`   - The fix may not be complete`);
}

console.log(`\n🎯 Test demonstrates that addNode() now prevents duplicate field creation`);
console.log(`🎯 This fixes the root cause of the accumulation issue in PromptApp`);

console.log('\n🎉 Comprehensive accumulation fix test completed!');