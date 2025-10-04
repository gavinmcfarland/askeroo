// Test for duplicate rendering issue in RecursiveGroupContainer
// Run with: npx tsx src/tests/duplicate-rendering-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🖥️ Testing Duplicate Rendering Issue...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logDetailedState(step: string) {
  console.log(`\n--- ${step} ---`);

  const tree = treeManager.getTree();
  const rootNode = tree.root;

  console.log(`Root group state:`);
  console.log(`  - active: ${rootNode.active}`);
  console.log(`  - completed: ${rootNode.completed}`);
  console.log(`  - visited: ${rootNode.visited}`);
  console.log(`  - children count: ${rootNode.children.length}`);

  rootNode.children.forEach((child, index) => {
    console.log(`Child ${index} (${child.id}):`);
    console.log(`  - type: ${child.type}`);
    console.log(`  - active: ${child.active}`);
    console.log(`  - completed: ${child.completed}`);
    console.log(`  - visited: ${child.visited}`);
    console.log(`  - value: "${child.value || 'undefined'}"`);

    // Simulate the visibility logic from RecursiveGroupContainer
    const showOnlyActiveAndCompleted = false;

    // Check which visibility conditions this child satisfies
    const visibilityReasons = [];
    if (child.active) visibilityReasons.push('active');
    if (child.completed) visibilityReasons.push('completed');
    if (child.visited) visibilityReasons.push('visited');

    // Check the different visibility paths
    let wouldShowInCompleted = false;
    let wouldShowInActive = false;

    // Path 1: Completed group rendering (if root is completed && !active)
    if (rootNode.completed && !rootNode.active) {
      if (child.type === 'field' && child.completed && !child.hideAfterSubmit) {
        wouldShowInCompleted = true;
      }
    }

    // Path 2: Active group rendering (if root is not completed or active)
    if (!rootNode.completed || rootNode.active) {
      if (showOnlyActiveAndCompleted) {
        if (child.active || child.completed || child.visited) {
          wouldShowInActive = true;
        }
      } else {
        // For progressive groups, show completed, active, and first pending field
        if (child.completed || child.active) {
          wouldShowInActive = true;
        } else {
          // Check if this is the first pending field
          const siblings = rootNode.children;
          const childIndex = siblings.indexOf(child);
          const allPreviousCompleted = siblings.slice(0, childIndex).every(prev => prev.completed);
          if (allPreviousCompleted) {
            wouldShowInActive = true;
          }
        }
      }
    }

    console.log(`  - visibility reasons: [${visibilityReasons.join(', ')}]`);
    console.log(`  - would show in completed group: ${wouldShowInCompleted}`);
    console.log(`  - would show in active group: ${wouldShowInActive}`);

    if (wouldShowInCompleted && wouldShowInActive) {
      console.log(`  ❌ DUPLICATE RENDERING DETECTED!`);
    }
  });
}

function performTreeBackNavigation() {
  console.log(`\n🔄 Performing back navigation...`);

  const result = treeManager.goBack();
  if (result.success) {
    console.log(`✓ Back navigation successful -> ${result.node?.id}`);
  } else {
    console.log(`❌ Back navigation failed: ${result.reason}`);
  }

  return result;
}

console.log('Step 1: Setting up scenario to reproduce duplicate rendering...');

// Create a group with a field (simulating the user's scenario)
const groupRequest = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};
adapter.addPromptRequestToTree(groupRequest);

const fieldRequest = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};
adapter.addPromptRequestToTree(fieldRequest, 'group1');

console.log('✓ Created group with field');

console.log('\n=== REPRODUCING DUPLICATE RENDERING SCENARIO ===');

// Step 1: Navigate to field and complete it
console.log('\nStep 1: User completes first field...');
treeManager.navigateTo('location-field');
treeManager.updateNode('location-field', { value: './my-plugin', completed: true });

logDetailedState('After completing field');

// Step 2: User goes back (first time - should work correctly)
console.log('\nStep 2: User goes back (first time)...');
performTreeBackNavigation();

logDetailedState('After first back navigation');

// Step 3: User completes field again
console.log('\nStep 3: User completes field again...');
treeManager.navigateTo('location-field');
treeManager.updateNode('location-field', { value: './my-plugin', completed: true });

logDetailedState('After second completion');

// Step 4: User goes back again (this might cause the duplicate)
console.log('\nStep 4: User goes back again (potential duplicate issue)...');
performTreeBackNavigation();

logDetailedState('After second back navigation (check for duplicates)');

// Step 5: One more cycle to confirm the pattern
console.log('\nStep 5: Third completion cycle...');
treeManager.navigateTo('location-field');
treeManager.updateNode('location-field', { value: './my-plugin', completed: true });

logDetailedState('After third completion');

console.log('\nStep 6: Third back navigation...');
performTreeBackNavigation();

logDetailedState('After third back navigation (check for more duplicates)');

console.log('\n=== ANALYSIS ===');

console.log('\n🔍 Key findings:');
console.log('- Look for any instances where "DUPLICATE RENDERING DETECTED!" appeared');
console.log('- Check if the root group state is causing both rendering paths to execute');
console.log('- Verify if timing issues between tree state and UI state could cause duplicates');

const currentTree = treeManager.getTree();
const field = currentTree.root.children.find(child => child.id === 'location-field');

console.log(`\nFinal field state:`);
console.log(`  - active: ${field?.active}`);
console.log(`  - completed: ${field?.completed}`);
console.log(`  - visited: ${field?.visited}`);
console.log(`  - value: "${field?.value}"`);

console.log('\n💡 If duplicates were detected, the issue is likely in:');
console.log('  1. RecursiveGroupContainer having multiple rendering paths for the same field');
console.log('  2. Timing issues between tree state updates and UI rendering');
console.log('  3. Group state not being properly synchronized with field state');

console.log('\n🎉 Duplicate rendering test completed!');