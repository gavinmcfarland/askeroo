// Test to check group label visibility
// Run with: npx tsx src/tests/group-label-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🏷️ Testing Group Label Visibility...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

console.log('Step 1: Creating groups with labels...');

// Add a group with explicit label
const mainGroup = {
  type: 'group',
  id: 'main-group',
  label: 'Main Configuration Group',
  flow: 'progressive' as const,
  depth: 0
};
const groupNode = adapter.addPromptRequestToTree(mainGroup);
console.log('✓ Added main group with label:', groupNode.label);

// Add a nested group
const nestedGroup = {
  type: 'group',
  id: 'nested-group',
  label: 'Nested Settings Group',
  flow: 'static' as const,
  depth: 1
};
const nestedNode = adapter.addPromptRequestToTree(nestedGroup, 'main-group');
console.log('✓ Added nested group with label:', nestedNode.label);

// Add some fields to the groups
const nameField = {
  type: 'text',
  id: 'user-name',
  label: 'Enter your name',
  depth: 1
};
adapter.addPromptRequestToTree(nameField, 'main-group');

const settingField = {
  type: 'confirm',
  id: 'enable-feature',
  label: 'Enable advanced features?',
  depth: 2
};
adapter.addPromptRequestToTree(settingField, 'nested-group');

console.log('\nStep 2: Tree structure with labels:');
console.log(treeManager.printTree());

console.log('\nStep 3: Inspecting node labels...');
const tree = treeManager.getTree();

function inspectLabels(node: any, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.type} "${node.id}":`);
  console.log(`${indent}  - label: "${node.label}" (type: ${typeof node.label})`);
  console.log(`${indent}  - labelDefined: ${node.label !== undefined}`);
  console.log(`${indent}  - labelEmpty: ${node.label === ''}`);
  console.log(`${indent}  - depth: ${node.depth}`);

  if (node.children && node.children.length > 0) {
    node.children.forEach((child: any) => {
      inspectLabels(child, depth + 1);
    });
  }
}

inspectLabels(tree.root);

console.log('\nStep 4: Testing group visibility conditions...');

// Check if groups have proper visibility settings
function checkVisibility(node: any, depth = 0) {
  const indent = '  '.repeat(depth);

  if (node.type === 'group') {
    console.log(`${indent}Group "${node.id}" visibility check:`);
    console.log(`${indent}  - Has label: ${!!node.label}`);
    console.log(`${indent}  - Label value: "${node.label}"`);
    console.log(`${indent}  - Active: ${node.active}`);
    console.log(`${indent}  - Completed: ${node.completed}`);
    console.log(`${indent}  - Has children: ${node.children && node.children.length > 0}`);

    // Check if group should be visible based on RecursiveGroupContainer logic
    const shouldShowLabel = node.label && (node.active || node.completed || (node.children && node.children.length > 0));
    console.log(`${indent}  - Should show label: ${shouldShowLabel}`);

    if (node.children) {
      node.children.forEach((child: any) => checkVisibility(child, depth + 1));
    }
  }
}

checkVisibility(tree.root);

console.log('\nStep 5: Simulating rendering conditions...');

// Test different rendering scenarios
const scenarios = [
  { name: 'Empty group', active: false, completed: false, hasChildren: false },
  { name: 'Active group with children', active: true, completed: false, hasChildren: true },
  { name: 'Completed group', active: false, completed: true, hasChildren: true },
  { name: 'Pending group with children', active: false, completed: false, hasChildren: true }
];

scenarios.forEach(scenario => {
  console.log(`\n📋 Scenario: ${scenario.name}`);
  console.log(`  - Active: ${scenario.active}, Completed: ${scenario.completed}, HasChildren: ${scenario.hasChildren}`);

  // Based on RecursiveGroupContainer logic
  const willShowGroup = scenario.hasChildren && (scenario.active || scenario.completed || (!scenario.active && !scenario.completed));
  console.log(`  - Will render group: ${willShowGroup}`);

  if (willShowGroup) {
    console.log(`  - Will show label: YES (if label exists)`);
  } else {
    console.log(`  - Will show label: NO (group not rendered)`);
  }
});

console.log('\n🎉 Group label test completed!');
console.log('\n💡 Things to check if labels still not showing:');
console.log('  1. Verify group has non-empty label');
console.log('  2. Check if group has children to render');
console.log('  3. Ensure group is in active/completed state or has visible children');
console.log('  4. Look for CSS issues that might hide the label');
console.log('  5. Check console for any rendering errors');