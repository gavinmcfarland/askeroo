// Debug the accumulation issue with repeated back navigation
// Run with: npx tsx src/tests/debug-accumulation-issue.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔍 Debugging Completed State Accumulation Issue...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Mock the legacy completed fields (like in PromptApp)
let legacyCompletedFields = new Set<string>();

// Track state changes for debugging
let stateChangeLog: string[] = [];

function logStateChange(action: string) {
  const treeCompleted = treeManager.findNodes(node => node.type === 'field' && node.completed);
  const legacyCompleted = Array.from(legacyCompletedFields);

  const entry = `${action}: tree=[${treeCompleted.map(n => n.id).join(', ')}], legacy=[${legacyCompleted.join(', ')}]`;
  stateChangeLog.push(entry);
  console.log(entry);
}

// Simulate the exact performTreeBackNavigation logic
function performTreeBackNavigation() {
  console.log('\n🔄 Performing tree back navigation...');

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

        console.log('Checking nodes for synchronization...');
        allNodes.forEach(node => {
          const treeCompleted = node.completed;
          const legacyCompleted = legacyCompletedFields.has(node.id);

          if (!treeCompleted && legacyCompleted) {
            console.log(`  - Node ${node.id}: tree=${treeCompleted}, legacy=${legacyCompleted} -> NEED TO REMOVE`);
            noLongerCompleted.push(node.id);
          } else {
            console.log(`  - Node ${node.id}: tree=${treeCompleted}, legacy=${legacyCompleted} -> OK`);
          }
        });

        // Clear from legacy completed fields
        if (noLongerCompleted.length > 0) {
          console.log(`Removing from legacy: [${noLongerCompleted.join(', ')}]`);
          noLongerCompleted.forEach(id => legacyCompletedFields.delete(id));
        } else {
          console.log('No fields to remove from legacy');
        }

        logStateChange('After back navigation');
      }
    }
  } catch (error) {
    console.warn('Tree navigation error:', error);
  }
}

function completeField(fieldId: string, value: string) {
  console.log(`\n✅ Completing field: ${fieldId} = "${value}"`);

  // Update tree
  treeManager.updateNode(fieldId, { value, completed: true });

  // Update legacy
  legacyCompletedFields.add(fieldId);

  logStateChange(`Completed ${fieldId}`);
}

console.log('Step 1: Setting up test scenario...');

// Create fields
const fields = [
  { type: 'text', id: 'field1', label: 'Field 1' },
  { type: 'text', id: 'field2', label: 'Field 2' },
  { type: 'text', id: 'field3', label: 'Field 3' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));
console.log('✓ Created test fields');

console.log('\n=== CYCLE 1: Testing Normal Back Navigation ===');

treeManager.navigateTo('field1');
completeField('field1', 'Value 1');

treeManager.navigateTo('field2');
completeField('field2', 'Value 2');

console.log('\n--- Before first back navigation ---');
logStateChange('Before back 1');

performTreeBackNavigation();

console.log('\n=== CYCLE 2: Testing Repeated Forward/Back ===');

treeManager.navigateTo('field2');
completeField('field2', 'Value 2 Updated');

treeManager.navigateTo('field3');
completeField('field3', 'Value 3');

console.log('\n--- Before second back navigation ---');
logStateChange('Before back 2');

performTreeBackNavigation();

console.log('\n=== CYCLE 3: Testing Third Forward/Back ===');

treeManager.navigateTo('field2');
completeField('field2', 'Value 2 Final');

console.log('\n--- Before third back navigation ---');
logStateChange('Before back 3');

performTreeBackNavigation();

console.log('\n=== ANALYSIS ===');

console.log('\nComplete state change log:');
stateChangeLog.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry}`);
});

console.log('\nLooking for accumulation patterns...');

// Check if legacy state is accumulating
const backNavigationStates = stateChangeLog.filter(entry => entry.includes('After back navigation'));
console.log('\nBack navigation results:');
backNavigationStates.forEach((state, index) => {
  console.log(`  Back ${index + 1}: ${state}`);
});

// Check final state
const finalTreeCompleted = treeManager.findNodes(node => node.type === 'field' && node.completed);
const finalLegacyCompleted = Array.from(legacyCompletedFields);

console.log('\nFinal state:');
console.log(`  Tree completed: [${finalTreeCompleted.map(n => n.id).join(', ')}]`);
console.log(`  Legacy completed: [${finalLegacyCompleted.join(', ')}]`);

const hasAccumulation = finalLegacyCompleted.length > 0 || finalTreeCompleted.length > 0;
console.log(`\n${hasAccumulation ? '❌ ACCUMULATION DETECTED' : '✅ NO ACCUMULATION'}`);

if (hasAccumulation) {
  console.log('\n🔍 Potential issues:');
  console.log('  1. Tree goBack() not resetting completed states properly');
  console.log('  2. Legacy synchronization logic has bug');
  console.log('  3. Multiple calls to performTreeBackNavigation');
  console.log('  4. State corruption in tree or legacy system');
}

console.log('\n🎉 Debug analysis completed!');