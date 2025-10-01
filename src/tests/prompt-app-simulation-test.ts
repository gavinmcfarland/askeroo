// Test that simulates the exact PromptApp flow
// Run with: npx tsx src/tests/prompt-app-simulation-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔄 Simulating Exact PromptApp Flow for Accumulation Issue...\n');

// Create tree manager and adapter exactly like PromptApp
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Mock legacy state like PromptApp
let completedFields = new Set<string>();
let isNavigatingBack = false;

function logFullState(step: string) {
  const history = treeManager.getNavigationPath();
  const activeNode = treeManager.getActiveNode();
  const canGoBack = treeManager.canGoBack();
  const allNodes = treeManager.findNodes(node => node.type === 'field');

  console.log(`\n📍 ${step}:`);
  console.log(`  Navigation history: [${history.map(n => n.id).join(' -> ')}]`);
  console.log(`  Active node: ${activeNode?.id || 'none'}`);
  console.log(`  Can go back: ${canGoBack}`);
  console.log(`  Legacy completed: [${Array.from(completedFields).join(', ')}]`);

  console.log(`  Tree field states:`);
  allNodes.forEach(node => {
    console.log(`    ${node.id}: completed=${node.completed}, active=${node.active}, visited=${node.visited}, value="${node.value || 'undefined'}"`);
  });
}

// Simulate the exact performTreeBackNavigation logic from PromptApp
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

        allNodes.forEach(node => {
          if (!node.completed && completedFields.has(node.id)) {
            noLongerCompleted.push(node.id);
          }
        });

        console.log(`Legacy sync: removing [${noLongerCompleted.join(', ')}]`);

        // Clear from legacy completed fields
        if (noLongerCompleted.length > 0) {
          noLongerCompleted.forEach(id => completedFields.delete(id));
        }

        return result.node;
      }
    }
  } catch (error) {
    console.warn('Tree navigation error:', error);
  }
  return null;
}

// Simulate the exact promptFn logic from PromptApp
function simulatePromptFn(request: any) {
  console.log(`\n📥 Processing prompt request: ${request.id} (${request.type})`);

  // Simulate the cleanup logic when navigating back
  const shouldCleanup = isNavigatingBack && request.type !== "group";

  if (shouldCleanup) {
    console.log(`🧹 Cleanup triggered for ${request.id}`);
    isNavigatingBack = false;

    // Remove from legacy completed if present
    if (completedFields.has(request.id)) {
      completedFields.delete(request.id);
      console.log(`Removed ${request.id} from legacy completed`);
    }
  }

  // Add prompt to tree structure (like PromptApp does)
  try {
    const currentGroup = adapter.getCurrentGroup();
    adapter.addPromptRequestToTree(request, currentGroup);

    // Activate the prompt in the tree (crucial for rendering)
    if (request.type !== "group") {
      const navResult = treeManager.navigateTo(request.id);
      console.log(`Navigate to ${request.id}: ${navResult.success ? 'SUCCESS' : 'FAILED'}`);
    }
  } catch (error) {
    console.warn('Tree management error:', error);
  }
}

// Simulate field completion (like PromptApp onSubmit)
function simulateFieldCompletion(fieldId: string, value: string) {
  console.log(`\n✅ Completing field: ${fieldId} = "${value}"`);

  // Update tree
  treeManager.updateNode(fieldId, { value, completed: true });

  // Update legacy
  completedFields.add(fieldId);

  // Clear back navigation flag
  isNavigatingBack = false;
}

// Simulate back navigation (like PromptApp handleBack)
function simulateBackNavigation() {
  console.log(`\n⬅️ User triggers back navigation...`);

  // Perform tree navigation and synchronization
  performTreeBackNavigation();

  // Set flag to indicate we're navigating back
  isNavigatingBack = true;

  console.log(`Set isNavigatingBack = true`);
}

console.log('Step 1: Setting up test scenario...');

// Create the group first (like real app)
const groupRequest = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};

console.log('\n=== SIMULATING EXACT PROMPTAPP FLOW ===');

console.log('\nStep 1: Process group request...');
simulatePromptFn(groupRequest);
logFullState('After group setup');

// Create first field
const field1Request = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};

console.log('\nStep 2: Process first field request...');
simulatePromptFn(field1Request);
logFullState('After first field request');

console.log('\nStep 3: User completes first field...');
simulateFieldCompletion('location-field', './my-plugin');
logFullState('After first field completion');

// Create second field
const field2Request = {
  type: 'text',
  id: 'name-field',
  label: 'What should it be called?',
  depth: 1
};

console.log('\nStep 4: Process second field request...');
simulatePromptFn(field2Request);
logFullState('After second field request');

console.log('\nStep 5: User goes back (first time)...');
simulateBackNavigation();
logFullState('After first back navigation');

console.log('\nStep 6: Process first field again (should cleanup)...');
simulatePromptFn(field1Request);
logFullState('After first field re-request');

console.log('\nStep 7: User completes first field again...');
simulateFieldCompletion('location-field', './my-plugin');
logFullState('After first field re-completion');

console.log('\nStep 8: Process second field again...');
simulatePromptFn(field2Request);
logFullState('After second field re-request');

console.log('\nStep 9: User goes back (second time - potential accumulation)...');
simulateBackNavigation();
logFullState('After second back navigation');

console.log('\nStep 10: Process first field again (check for accumulation)...');
simulatePromptFn(field1Request);
logFullState('After second field re-request (check accumulation)');

console.log('\n=== ANALYSIS ===');

// Check final state
const finalTreeCompleted = treeManager.findNodes(node => node.type === 'field' && node.completed);
const finalLegacyCompleted = Array.from(completedFields);

console.log('\nFinal state:');
console.log(`  Tree completed: [${finalTreeCompleted.map(n => n.id).join(', ')}]`);
console.log(`  Legacy completed: [${finalLegacyCompleted.join(', ')}]`);

const hasAccumulation = finalLegacyCompleted.length > 0 || finalTreeCompleted.length > 0;
console.log(`\n${hasAccumulation ? '❌ ACCUMULATION DETECTED' : '✅ NO ACCUMULATION'}`);

if (hasAccumulation) {
  console.log('\n🔍 Root cause analysis:');
  console.log('  1. Check if navigation history is being built correctly');
  console.log('  2. Check if tree goBack() is properly resetting states');
  console.log('  3. Check if legacy synchronization is working');
  console.log('  4. Check if isNavigatingBack flag is being handled correctly');
}

console.log('\n🎉 PromptApp simulation test completed!');