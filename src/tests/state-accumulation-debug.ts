// Debug state accumulation in forward/back cycles
// Run with: npx tsx src/tests/state-accumulation-debug.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔄 Debugging State Accumulation in Forward/Back Cycles...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Track all state changes
let stateHistory: Array<{
  step: string;
  treeCompleted: string[];
  legacyCompleted: string[];
  treeHistory: string[];
  activeNode: string | null;
}> = [];

// Mock legacy state
let legacyCompletedFields = new Set<string>();

function recordState(step: string) {
  const treeCompleted = treeManager.findNodes(node => node.type === 'field' && node.completed).map(n => n.id);
  const legacyCompleted = Array.from(legacyCompletedFields);
  const history = treeManager.getNavigationPath().map(n => n.id);
  const activeNode = treeManager.getActiveNode()?.id || null;

  const record = {
    step,
    treeCompleted,
    legacyCompleted,
    treeHistory: history,
    activeNode
  };

  stateHistory.push(record);

  console.log(`\n📊 ${step}:`);
  console.log(`  Tree completed: [${treeCompleted.join(', ')}]`);
  console.log(`  Legacy completed: [${legacyCompleted.join(', ')}]`);
  console.log(`  Tree history: [${history.join(' -> ')}]`);
  console.log(`  Active node: ${activeNode}`);

  // Check for accumulation
  const totalCompleted = treeCompleted.length + legacyCompleted.length;
  if (totalCompleted > 1) {
    console.log(`  ⚠️ ACCUMULATION DETECTED: ${totalCompleted} total completed states`);
  }
}

function performTreeBackNavigation() {
  console.log('\n🔄 Performing back navigation...');

  try {
    const canGoBack = treeManager.canGoBack();
    console.log(`Can go back: ${canGoBack}`);

    if (canGoBack) {
      const result = treeManager.goBack();
      console.log(`Go back result: ${result.success ? 'SUCCESS' : 'FAILED'} -> ${result.node?.id}`);

      if (result.success) {
        // Synchronize legacy state with tree state
        const allNodes = treeManager.findNodes(() => true);
        const noLongerCompleted: string[] = [];

        allNodes.forEach(node => {
          if (!node.completed && legacyCompletedFields.has(node.id)) {
            noLongerCompleted.push(node.id);
          }
        });

        console.log(`Nodes to remove from legacy: [${noLongerCompleted.join(', ')}]`);

        // Clear from legacy completed fields
        if (noLongerCompleted.length > 0) {
          noLongerCompleted.forEach(id => legacyCompletedFields.delete(id));
        }

        return result.node;
      }
    }
  } catch (error) {
    console.warn('Tree navigation error:', error);
  }
  return null;
}

function completeField(fieldId: string, value: string) {
  console.log(`\n✅ Completing field: ${fieldId} = "${value}"`);

  // Navigate to field first
  const navResult = treeManager.navigateTo(fieldId);
  console.log(`Navigate to ${fieldId}: ${navResult.success ? 'SUCCESS' : 'FAILED'}`);

  // Update tree
  treeManager.updateNode(fieldId, { value, completed: true });

  // Update legacy
  legacyCompletedFields.add(fieldId);
}

console.log('Step 1: Setting up test scenario...');

// Create a group with fields
const groupRequest = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};
adapter.addPromptRequestToTree(groupRequest);

const field1Request = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};
adapter.addPromptRequestToTree(field1Request, 'group1');

const field2Request = {
  type: 'text',
  id: 'name-field',
  label: 'What should it be called?',
  depth: 1
};
adapter.addPromptRequestToTree(field2Request, 'group1');

console.log('✓ Created group with 2 fields');

recordState('Initial state');

console.log('\n=== REPRODUCING ACCUMULATION ISSUE ===');

// Cycle 1: Complete -> Back
console.log('\n--- CYCLE 1 ---');
completeField('location-field', './my-plugin');
recordState('Cycle 1: After completing field');

performTreeBackNavigation();
recordState('Cycle 1: After back navigation');

// Cycle 2: Complete -> Back
console.log('\n--- CYCLE 2 ---');
completeField('location-field', './my-plugin');
recordState('Cycle 2: After completing field');

performTreeBackNavigation();
recordState('Cycle 2: After back navigation');

// Cycle 3: Complete -> Back
console.log('\n--- CYCLE 3 ---');
completeField('location-field', './my-plugin');
recordState('Cycle 3: After completing field');

performTreeBackNavigation();
recordState('Cycle 3: After back navigation');

// Cycle 4: Complete -> Back
console.log('\n--- CYCLE 4 ---');
completeField('location-field', './my-plugin');
recordState('Cycle 4: After completing field');

performTreeBackNavigation();
recordState('Cycle 4: After back navigation');

console.log('\n=== ACCUMULATION ANALYSIS ===');

console.log('\nState progression:');
stateHistory.forEach((record, index) => {
  const totalCompleted = record.treeCompleted.length + record.legacyCompleted.length;
  const status = totalCompleted > 1 ? '❌ ACCUMULATION' : '✅ OK';
  console.log(`${index + 1}. ${record.step}: ${totalCompleted} total completed [${status}]`);
});

console.log('\nLooking for accumulation patterns:');

// Check if any step has accumulation
const accumulationSteps = stateHistory.filter(record =>
  record.treeCompleted.length + record.legacyCompleted.length > 1
);

if (accumulationSteps.length > 0) {
  console.log('\n❌ ACCUMULATION DETECTED in these steps:');
  accumulationSteps.forEach(record => {
    console.log(`  - ${record.step}: tree=[${record.treeCompleted.join(', ')}], legacy=[${record.legacyCompleted.join(', ')}]`);
  });
} else {
  console.log('\n✅ No accumulation detected in this test');
}

// Check final state
const finalRecord = stateHistory[stateHistory.length - 1];
const finalTotal = finalRecord.treeCompleted.length + finalRecord.legacyCompleted.length;

console.log(`\nFinal state: ${finalTotal} total completed states`);

if (finalTotal > 0) {
  console.log('❌ Fields are not being properly cleared!');
  console.log('🔍 Possible causes:');
  console.log('  1. Tree navigation history corruption');
  console.log('  2. Legacy state synchronization failure');
  console.log('  3. Multiple tree instances or state corruption');
  console.log('  4. Timing issues between tree and legacy state');
} else {
  console.log('✅ All states properly cleared');
}

console.log('\n🔍 Debug information:');
console.log(`Final tree history: [${finalRecord.treeHistory.join(' -> ')}]`);
console.log(`Final active node: ${finalRecord.activeNode}`);

console.log('\n🎉 State accumulation debug completed!');