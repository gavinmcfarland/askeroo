// Comprehensive test for back navigation with legacy sync
// This test simulates the exact scenario described by the user
// Run with: npx tsx src/tests/comprehensive-back-navigation-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔄 Comprehensive Back Navigation Test (User Reported Issue)...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Simulate legacy state (like in PromptApp)
let legacyCompletedFields = new Set<string>();

// Simulate the performTreeBackNavigation function from PromptApp
function performTreeBackNavigation() {
  try {
    const canGoBack = treeManager.canGoBack();
    if (canGoBack) {
      const result = treeManager.goBack();
      if (result.success) {
        console.log(`Tree navigation: went back to ${result.node?.id}`);

        // Synchronize legacy state with tree state
        const allNodes = treeManager.findNodes(() => true);
        const noLongerCompleted: string[] = [];

        allNodes.forEach(node => {
          if (!node.completed && legacyCompletedFields.has(node.id)) {
            noLongerCompleted.push(node.id);
          }
        });

        // Clear from legacy completed fields
        if (noLongerCompleted.length > 0) {
          console.log(`Removing from legacy completed: [${noLongerCompleted.join(', ')}]`);
          noLongerCompleted.forEach(id => legacyCompletedFields.delete(id));
        }
      }
    }
  } catch (error) {
    console.warn('Tree navigation error:', error);
  }
}

// Helper to complete a field and update both tree and legacy state
function completeField(fieldId: string, value: string) {
  treeManager.updateNode(fieldId, { value, completed: true });
  legacyCompletedFields.add(fieldId);
  console.log(`Completed ${fieldId}: "${value}"`);
}

function logCurrentState(step: string) {
  console.log(`\n--- ${step} ---`);

  const treeState = treeManager.findNodes(node => node.type === 'field');
  const activeNode = treeManager.getActiveNode();

  console.log('Tree state:');
  treeState.forEach(node => {
    const active = node.active ? ' [ACTIVE]' : '';
    const visited = node.visited ? ' [VISITED]' : '';
    console.log(`  ${node.id}: completed=${node.completed}, value="${node.value || 'undefined'}"${active}${visited}`);
  });

  console.log(`Legacy completed: [${Array.from(legacyCompletedFields).join(', ')}]`);
  console.log(`Currently active: ${activeNode?.id || 'none'}`);

  // Check for sync issues
  const treeCompleted = treeState.filter(node => node.completed).map(node => node.id);
  const legacyCompleted = Array.from(legacyCompletedFields);

  const inSync = treeCompleted.length === legacyCompleted.length &&
                 treeCompleted.every(id => legacyCompleted.includes(id));

  console.log(`Sync status: ${inSync ? '✅ SYNCHRONIZED' : '❌ OUT OF SYNC'}`);

  if (!inSync) {
    console.log(`  Tree completed: [${treeCompleted.join(', ')}]`);
    console.log(`  Legacy completed: [${legacyCompleted.join(', ')}]`);
  }
}

console.log('Step 1: Creating test scenario...');

// Create 3 fields
const fields = [
  { type: 'text', id: 'name', label: 'Enter your name' },
  { type: 'email', id: 'email', label: 'Enter your email' },
  { type: 'confirm', id: 'confirm', label: 'Confirm details?' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));
console.log('✓ Created 3 test fields: name, email, confirm');

console.log('\n=== FIRST VISIT CYCLE ===');

console.log('\nStep 2: First forward progression...');
treeManager.navigateTo('name');
completeField('name', 'John Doe');
logCurrentState('After completing name field');

treeManager.navigateTo('email');
completeField('email', 'john@example.com');
logCurrentState('After completing email field');

console.log('\nStep 3: First back navigation...');
console.log('User clicks back button...');
performTreeBackNavigation();
logCurrentState('After FIRST back navigation');

console.log('\n=== SECOND VISIT CYCLE (THE PROBLEMATIC ONE) ===');

console.log('\nStep 4: User goes forward again...');
treeManager.navigateTo('email');
completeField('email', 'john.doe@example.com'); // User updates the email
logCurrentState('After re-completing email field');

treeManager.navigateTo('confirm');
completeField('confirm', 'true');
logCurrentState('After completing confirm field');

console.log('\nStep 5: Second back navigation (THE PROBLEM CASE)...');
console.log('User clicks back button again...');
performTreeBackNavigation();
logCurrentState('After SECOND back navigation (should clear email completed state)');

console.log('\n=== VERIFICATION ===');

const emailNode = treeManager.getNode('email');
const confirmNode = treeManager.getNode('confirm');
const nameNode = treeManager.getNode('name');

console.log('\nExpected behavior after second back navigation:');
console.log('  - email field: completed=false (user went back to it)');
console.log('  - confirm field: completed=false (user left it)');
console.log('  - name field: completed=false (should be cleared since user is now at email)');

console.log('\nActual results:');
console.log(`  - email field: completed=${emailNode?.completed}`);
console.log(`  - confirm field: completed=${confirmNode?.completed}`);
console.log(`  - name field: completed=${nameNode?.completed}`);

console.log('\nLegacy state check:');
console.log(`  - email in legacy: ${legacyCompletedFields.has('email')}`);
console.log(`  - confirm in legacy: ${legacyCompletedFields.has('confirm')}`);
console.log(`  - name in legacy: ${legacyCompletedFields.has('name')}`);

// The key test: both tree and legacy should show email as not completed
const emailTreeCompleted = emailNode?.completed || false;
const emailLegacyCompleted = legacyCompletedFields.has('email');

const isFixed = !emailTreeCompleted && !emailLegacyCompleted;

console.log(`\n${isFixed ? '✅' : '❌'} Issue ${isFixed ? 'FIXED' : 'STILL EXISTS'}`);

if (isFixed) {
  console.log('\n🎉 SUCCESS! The repeated forward/back navigation issue is resolved!');
  console.log('  ✓ Tree correctly resets completed states on back navigation');
  console.log('  ✓ Legacy state is properly synchronized');
  console.log('  ✓ User can re-enter fields after going back');
} else {
  console.log('\n❌ ISSUE PERSISTS!');
  console.log('  - Check if performTreeBackNavigation is being called');
  console.log('  - Verify tree goBack() is working correctly');
  console.log('  - Ensure legacy synchronization logic is correct');
}

console.log('\n=== ADDITIONAL TEST: Third cycle ===');

console.log('\nTesting one more cycle to be thorough...');
treeManager.navigateTo('email');
completeField('email', 'final@example.com');

console.log('Going back a third time...');
performTreeBackNavigation();
logCurrentState('After THIRD back navigation');

const finalEmailCompleted = treeManager.getNode('email')?.completed;
const finalEmailInLegacy = legacyCompletedFields.has('email');

console.log(`\nFinal check: email completed=${finalEmailCompleted}, in legacy=${finalEmailInLegacy}`);
console.log(`Third cycle: ${!finalEmailCompleted && !finalEmailInLegacy ? '✅ PASS' : '❌ FAIL'}`);

console.log('\n🎉 Comprehensive test completed!');