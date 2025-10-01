// Test specific issue with first prompt accumulating
// Run with: npx tsx src/tests/first-prompt-accumulation-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔍 Testing First Prompt Accumulation Issue...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Mock the legacy completed fields
let legacyCompletedFields = new Set<string>();

// Track state for each back navigation
let backNavigationCount = 0;

function performTreeBackNavigation() {
  backNavigationCount++;
  console.log(`\n🔄 Back Navigation #${backNavigationCount}`);

  try {
    const canGoBack = treeManager.canGoBack();
    if (canGoBack) {
      const result = treeManager.goBack();
      if (result.success) {
        console.log(`Tree navigation: went back to ${result.node?.id}`);

        // Get current state before synchronization
        const allNodes = treeManager.findNodes(() => true);
        console.log('Tree state after goBack():');
        allNodes.forEach(node => {
          if (node.type === 'field') {
            console.log(`  ${node.id}: completed=${node.completed}, active=${node.active}, visited=${node.visited}`);
          }
        });

        // Synchronize legacy state with tree state
        const noLongerCompleted: string[] = [];
        allNodes.forEach(node => {
          if (!node.completed && legacyCompletedFields.has(node.id)) {
            noLongerCompleted.push(node.id);
          }
        });

        console.log(`Legacy before sync: [${Array.from(legacyCompletedFields).join(', ')}]`);
        console.log(`Need to remove: [${noLongerCompleted.join(', ')}]`);

        // Clear from legacy completed fields
        if (noLongerCompleted.length > 0) {
          noLongerCompleted.forEach(id => legacyCompletedFields.delete(id));
        }

        console.log(`Legacy after sync: [${Array.from(legacyCompletedFields).join(', ')}]`);

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

  // Update tree
  treeManager.updateNode(fieldId, { value, completed: true });

  // Update legacy
  legacyCompletedFields.add(fieldId);

  console.log(`Tree state: ${fieldId} completed=${treeManager.getNode(fieldId)?.completed}`);
  console.log(`Legacy state: [${Array.from(legacyCompletedFields).join(', ')}]`);
}

function logCurrentState(step: string) {
  console.log(`\n--- ${step} ---`);
  const allNodes = treeManager.findNodes(node => node.type === 'field');
  const activeNode = treeManager.getActiveNode();

  console.log('All field states:');
  allNodes.forEach(node => {
    const active = node.active ? ' [ACTIVE]' : '';
    const visited = node.visited ? ' [VISITED]' : '';
    console.log(`  ${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"${active}${visited}`);
  });

  console.log(`Currently active: ${activeNode?.id || 'none'}`);
  console.log(`Legacy completed: [${Array.from(legacyCompletedFields).join(', ')}]`);

  // Check for the specific issue: first field accumulating
  const firstField = treeManager.getNode('first-field');
  const firstInLegacy = legacyCompletedFields.has('first-field');
  const firstCompleted = firstField?.completed || false;

  console.log(`🎯 First field check: tree.completed=${firstCompleted}, legacy.has=${firstInLegacy}`);

  if (firstInLegacy && !firstCompleted) {
    console.log('❌ ISSUE DETECTED: First field is in legacy but not in tree (accumulation!)');
  } else if (!firstInLegacy && !firstCompleted) {
    console.log('✅ First field properly cleared');
  }
}

console.log('Step 1: Setting up reproduction scenario...');

// Create fields that match a typical flow
const fields = [
  { type: 'text', id: 'first-field', label: 'Where should it be created?' },
  { type: 'text', id: 'second-field', label: 'What should it be called?' },
  { type: 'confirm', id: 'third-field', label: 'Confirm creation?' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));
console.log('✓ Created test fields to reproduce the issue');

console.log('\n=== REPRODUCING THE ACCUMULATION ISSUE ===');

// Cycle 1: Complete first two fields, then go back
console.log('\nCycle 1: First progression...');
treeManager.navigateTo('first-field');
completeField('first-field', './my-plugin');

treeManager.navigateTo('second-field');
completeField('second-field', 'my-plugin-name');

logCurrentState('After completing first two fields');

const backNode1 = performTreeBackNavigation();
logCurrentState(`After back navigation #${backNavigationCount} -> ${backNode1?.id}`);

// Cycle 2: Complete first field again, go to second, then back
console.log('\nCycle 2: Second progression...');
treeManager.navigateTo('first-field');
completeField('first-field', './my-plugin'); // Same value again

treeManager.navigateTo('second-field');
completeField('second-field', 'updated-plugin-name');

logCurrentState('After second completion cycle');

const backNode2 = performTreeBackNavigation();
logCurrentState(`After back navigation #${backNavigationCount} -> ${backNode2?.id}`);

// Cycle 3: Repeat again to see accumulation
console.log('\nCycle 3: Third progression...');
treeManager.navigateTo('first-field');
completeField('first-field', './my-plugin'); // Same value again

treeManager.navigateTo('second-field');
completeField('second-field', 'final-plugin-name');

logCurrentState('After third completion cycle');

const backNode3 = performTreeBackNavigation();
logCurrentState(`After back navigation #${backNavigationCount} -> ${backNode3?.id}`);

console.log('\n=== ANALYSIS ===');

// Check if we can reproduce the accumulation
const finalFirstField = treeManager.getNode('first-field');
const finalFirstInLegacy = legacyCompletedFields.has('first-field');

console.log('\nFinal first field analysis:');
console.log(`Tree completed: ${finalFirstField?.completed}`);
console.log(`Legacy has: ${finalFirstInLegacy}`);
console.log(`Value: "${finalFirstField?.value}"`);

if (finalFirstInLegacy || finalFirstField?.completed) {
  console.log('\n❌ ISSUE REPRODUCED: First field is not properly cleared!');
  console.log('The first field is accumulating and not being reset on back navigation.');
} else {
  console.log('\n✅ Issue not reproduced in this test');
  console.log('The logic appears to be working correctly in isolation.');
  console.log('The issue might be in a different part of the application or specific UI interactions.');
}

console.log('\n🔍 Debugging information:');
console.log(`Total back navigations performed: ${backNavigationCount}`);
console.log('Navigation history:', treeManager.getNavigationPath().map(n => n.id));

console.log('\n🎉 First prompt accumulation test completed!');