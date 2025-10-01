// Test CompletedFields plugin synchronization with back navigation
// Run with: npx tsx src/tests/completed-fields-plugin-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';
import {
  registerForStateUpdates,
  notifyStateUpdate,
  PromptAppState
} from '../core/StateRegistry.js';
import {
  getCompletedFields,
  updateCompletedFieldsState,
  initializeCompletedFieldsStore
} from '../plugins/completed-fields/CompletedFieldsStore.js';

console.log('🔌 Testing CompletedFields Plugin Synchronization...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Simulate PromptApp state
let mockFieldValues: Record<string, any> = {};
let mockCompletedFields = new Set<string>();
let mockVisitedFields = new Set<string>();
let mockFieldProperties = new Map<string, any>();
let mockFieldMessages: Record<string, string> = {};
let mockFieldGroupNames: Record<string, string> = {};
let mockFieldGroupIds: Record<string, string> = {};

// Initialize the CompletedFields plugin store
let pluginStateUpdates: any[] = [];
initializeCompletedFieldsStore((newState) => {
  pluginStateUpdates.push(newState);
  console.log('Plugin store updated:', {
    completedCount: newState.completedFields.size,
    completedFields: Array.from(newState.completedFields)
  });
});

// Register plugin for state updates (like it does in real app)
registerForStateUpdates((state: PromptAppState) => {
  console.log('Plugin received state update:', {
    completedCount: state.fieldState.completed.size,
    completedFields: Array.from(state.fieldState.completed)
  });

  // Update the plugin store (like CompletedFields.tsx does)
  updateCompletedFieldsState({
    completedFields: state.fieldState.completed,
    fieldValues: state.fieldState.values,
    groupNames: state.fieldState.groupNames,
    groupIds: state.fieldState.groupIds,
    fieldMessages: state.fieldState.messages,
    fieldProperties: state.fieldState.properties,
  });
});

// Simulate the performTreeBackNavigation function with plugin notification
function performTreeBackNavigationWithPluginSync() {
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
          if (!node.completed && mockCompletedFields.has(node.id)) {
            noLongerCompleted.push(node.id);
          }
        });

        // Clear from legacy completed fields
        if (noLongerCompleted.length > 0) {
          console.log(`Removing from completed: [${noLongerCompleted.join(', ')}]`);
          noLongerCompleted.forEach(id => mockCompletedFields.delete(id));

          // Immediately notify plugins of the state change
          setTimeout(() => {
            notifyStateUpdate({
              fieldState: {
                values: mockFieldValues,
                visited: mockVisitedFields,
                completed: mockCompletedFields,
                properties: mockFieldProperties,
                messages: mockFieldMessages,
                groupNames: mockFieldGroupNames,
                groupIds: mockFieldGroupIds,
              },
              groupState: {
                progressive: new Set(),
                phased: new Set(),
                static: new Set(),
                completed: new Set(),
                order: [],
                arrowNavigation: new Set(),
                depths: new Map(),
              },
              currentGroup: null,
            });
          }, 0);
        }
      }
    }
  } catch (error) {
    console.warn('Tree navigation error:', error);
  }
}

// Helper to complete a field
function completeField(fieldId: string, value: string, label: string) {
  // Update tree
  treeManager.updateNode(fieldId, { value, completed: true });

  // Update mock legacy state
  mockCompletedFields.add(fieldId);
  mockFieldValues[fieldId] = value;
  mockFieldMessages[fieldId] = label;

  console.log(`Completed field: ${fieldId} = "${value}"`);

  // Notify plugins
  notifyStateUpdate({
    fieldState: {
      values: mockFieldValues,
      visited: mockVisitedFields,
      completed: mockCompletedFields,
      properties: mockFieldProperties,
      messages: mockFieldMessages,
      groupNames: mockFieldGroupNames,
      groupIds: mockFieldGroupIds,
    },
    groupState: {
      progressive: new Set(),
      phased: new Set(),
      static: new Set(),
      completed: new Set(),
      order: [],
      arrowNavigation: new Set(),
      depths: new Map(),
    },
    currentGroup: null,
  });
}

function checkPluginSync(step: string) {
  console.log(`\n--- ${step} ---`);

  const treeCompleted = treeManager.findNodes(node => node.type === 'field' && node.completed);
  const legacyCompleted = Array.from(mockCompletedFields);
  const pluginCompleted = getCompletedFields();

  console.log(`Tree completed: [${treeCompleted.map(n => n.id).join(', ')}]`);
  console.log(`Legacy completed: [${legacyCompleted.join(', ')}]`);
  console.log(`Plugin completed: [${pluginCompleted.map(f => f.id).join(', ')}]`);

  const treeLegacySync = treeCompleted.length === legacyCompleted.length &&
                        treeCompleted.every(node => legacyCompleted.includes(node.id));

  const legacyPluginSync = legacyCompleted.length === pluginCompleted.length &&
                          legacyCompleted.every(id => pluginCompleted.some(f => f.id === id));

  console.log(`Tree ↔ Legacy sync: ${treeLegacySync ? '✅' : '❌'}`);
  console.log(`Legacy ↔ Plugin sync: ${legacyPluginSync ? '✅' : '❌'}`);

  return treeLegacySync && legacyPluginSync;
}

console.log('Step 1: Setting up test fields...');

// Create test fields
const fields = [
  { type: 'text', id: 'name', label: 'Enter your name' },
  { type: 'email', id: 'email', label: 'Enter your email' },
  { type: 'confirm', id: 'confirm', label: 'Confirm details?' }
];

fields.forEach(field => adapter.addPromptRequestToTree(field));
console.log('✓ Created test fields');

console.log('\n=== TESTING PLUGIN SYNCHRONIZATION ===');

console.log('\nStep 2: First completion cycle...');
treeManager.navigateTo('name');
completeField('name', 'John Doe', 'Enter your name');

treeManager.navigateTo('email');
completeField('email', 'john@example.com', 'Enter your email');

checkPluginSync('After completing name and email');

console.log('\nStep 3: First back navigation...');
performTreeBackNavigationWithPluginSync();

// Give time for async updates
await new Promise(resolve => setTimeout(resolve, 10));

const firstBackSync = checkPluginSync('After first back navigation');

console.log('\nStep 4: Second completion cycle...');
treeManager.navigateTo('email');
completeField('email', 'john.updated@example.com', 'Enter your email');

treeManager.navigateTo('confirm');
completeField('confirm', 'true', 'Confirm details?');

checkPluginSync('After second completion cycle');

console.log('\nStep 5: Second back navigation (THE CRITICAL TEST)...');
performTreeBackNavigationWithPluginSync();

// Give time for async updates
await new Promise(resolve => setTimeout(resolve, 10));

const secondBackSync = checkPluginSync('After second back navigation');

console.log('\nStep 6: Third completion cycle (testing persistence)...');
treeManager.navigateTo('email');
completeField('email', 'john.final@example.com', 'Enter your email');

console.log('\nStep 7: Third back navigation...');
performTreeBackNavigationWithPluginSync();

// Give time for async updates
await new Promise(resolve => setTimeout(resolve, 10));

const thirdBackSync = checkPluginSync('After third back navigation');

console.log('\n=== FINAL RESULTS ===');

console.log(`First back navigation sync: ${firstBackSync ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Second back navigation sync: ${secondBackSync ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Third back navigation sync: ${thirdBackSync ? '✅ PASS' : '❌ FAIL'}`);

const allPassed = firstBackSync && secondBackSync && thirdBackSync;

console.log(`\n${allPassed ? '🎉' : '❌'} CompletedFields plugin synchronization: ${allPassed ? 'WORKING' : 'BROKEN'}`);

if (allPassed) {
  console.log('\n✅ SUCCESS! CompletedFields plugin properly synchronizes with back navigation');
  console.log('  ✓ Plugin receives immediate state updates');
  console.log('  ✓ Completed fields are cleared from plugin display');
  console.log('  ✓ No accumulation of duplicate completed states');
} else {
  console.log('\n❌ ISSUE FOUND! CompletedFields plugin synchronization needs more work');
  console.log('  - Check if notifyStateUpdate is being called correctly');
  console.log('  - Verify plugin store update timing');
  console.log('  - Ensure proper state cleanup in plugin');
}

console.log('\n🎉 CompletedFields plugin test completed!');