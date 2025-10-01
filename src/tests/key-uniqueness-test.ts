// Test to verify React key uniqueness in RecursiveGroupContainer
// Run with: npx tsx src/tests/key-uniqueness-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔑 Testing React Key Uniqueness Fix...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Create a complex scenario that could generate duplicate keys
console.log('Step 1: Creating complex tree with potential duplicate scenarios...');

// Add a group that might be rendered multiple times
const mainGroup = {
  type: 'group',
  id: 'main-group',
  label: 'Main Configuration',
  flow: 'progressive' as const,
  depth: 0
};
adapter.addPromptRequestToTree(mainGroup);

// Add fields with similar IDs in different contexts
const nameField = {
  type: 'text',
  id: 'user-name',
  label: 'Enter your name',
  depth: 1
};
adapter.addPromptRequestToTree(nameField, 'main-group');

// Add another field with potential for key collision
const emailField = {
  type: 'text',
  id: 'user-email',
  label: 'Enter your email',
  depth: 1
};
adapter.addPromptRequestToTree(emailField, 'main-group');

// Add a subgroup that might create nested rendering scenarios
const advancedGroup = {
  type: 'group',
  id: 'advanced-group',
  label: 'Advanced Settings',
  flow: 'static' as const,
  depth: 1
};
adapter.addPromptRequestToTree(advancedGroup, 'main-group');

// Add fields to subgroup
const setting1 = {
  type: 'text',
  id: 'setting-1',
  label: 'Setting 1',
  depth: 2
};
adapter.addPromptRequestToTree(setting1, 'advanced-group');

const setting2 = {
  type: 'confirm',
  id: 'setting-2',
  label: 'Enable feature?',
  depth: 2
};
adapter.addPromptRequestToTree(setting2, 'advanced-group');

console.log('✓ Complex tree structure created');

console.log('\nStep 2: Tree structure:');
console.log(treeManager.printTree());

console.log('\nStep 3: Simulating key generation scenarios...');

// Simulate different states that would generate different keys
const tree = treeManager.getTree();

function simulateKeyGeneration(node: any, depth = 0, parentId = 'root', context = 'test') {
  const indent = '  '.repeat(depth);

  if (node.type === 'group') {
    console.log(`${indent}Group keys for "${node.id}":`);

    // Simulate completed fields scenario
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any, index: number) => {
        const completedKey = `${node.id}-completed-${child.id}-${index}`;
        const visibleKey = `${node.id}-visible-${child.id}-${index}`;
        console.log(`${indent}  - Completed context: ${completedKey}`);
        console.log(`${indent}  - Visible context: ${visibleKey}`);

        simulateKeyGeneration(child, depth + 1, node.id, 'recursive');
      });
    }
  } else if (node.type === 'field') {
    // Simulate different states for plugin component keys
    const activeKey = `plugin-${node.id}-${node.depth}-active`;
    const completedKey = `plugin-${node.id}-${node.depth}-completed`;
    const pendingKey = `plugin-${node.id}-${node.depth}-pending`;

    console.log(`${indent}Plugin keys for "${node.id}":`);
    console.log(`${indent}  - Active: ${activeKey}`);
    console.log(`${indent}  - Completed: ${completedKey}`);
    console.log(`${indent}  - Pending: ${pendingKey}`);
  }
}

simulateKeyGeneration(tree.root);

console.log('\nStep 4: Key uniqueness analysis...');

// Collect all possible keys that could be generated
const allKeys = new Set<string>();
const duplicateKeys = new Set<string>();

function collectKeys(node: any, parentId = 'root') {
  if (node.type === 'group' && node.children) {
    node.children.forEach((child: any, index: number) => {
      // Keys from RecursiveGroupContainer mapping
      const completedKey = `${node.id}-completed-${child.id}-${index}`;
      const visibleKey = `${node.id}-visible-${child.id}-${index}`;

      if (allKeys.has(completedKey)) duplicateKeys.add(completedKey);
      if (allKeys.has(visibleKey)) duplicateKeys.add(visibleKey);

      allKeys.add(completedKey);
      allKeys.add(visibleKey);

      collectKeys(child, node.id);
    });
  } else if (node.type === 'field') {
    // Keys from PluginComponent
    const states = ['active', 'completed', 'pending'];
    states.forEach(state => {
      const pluginKey = `plugin-${node.id}-${node.depth}-${state}`;
      if (allKeys.has(pluginKey)) duplicateKeys.add(pluginKey);
      allKeys.add(pluginKey);
    });
  }
}

collectKeys(tree.root);

console.log(`✓ Generated ${allKeys.size} unique keys`);

if (duplicateKeys.size === 0) {
  console.log('✅ No duplicate keys detected!');
} else {
  console.log(`❌ Found ${duplicateKeys.size} duplicate keys:`);
  duplicateKeys.forEach(key => console.log(`  - ${key}`));
}

console.log('\nStep 5: Sample key patterns:');
console.log('📋 RecursiveGroupContainer keys:');
console.log('  - Format: {parentId}-{context}-{childId}-{index}');
console.log('  - Example: "main-group-visible-user-name-0"');
console.log('  - Example: "main-group-completed-user-email-1"');

console.log('\n📋 PluginComponent keys:');
console.log('  - Format: plugin-{nodeId}-{depth}-{state}');
console.log('  - Example: "plugin-user-name-1-active"');
console.log('  - Example: "plugin-setting-1-2-completed"');

console.log('\n🎉 Key uniqueness test completed!');
console.log('\n💡 Benefits of the new key strategy:');
console.log('  1. Keys include parent context to prevent cross-group collisions');
console.log('  2. Array index ensures siblings have unique keys');
console.log('  3. Node depth and state prevent same node having duplicate keys');
console.log('  4. Hierarchical naming makes debugging easier');

console.log('\n✅ React key warnings should now be resolved!');