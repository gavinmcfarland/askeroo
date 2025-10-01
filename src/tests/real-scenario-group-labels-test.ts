// Test real scenario where nested group labels don't show
// Run with: npx tsx src/tests/real-scenario-group-labels-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🎯 Testing Real Scenario Group Labels Issue...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function logTreeStructureDetailed(step: string) {
  const tree = treeManager.getTree();

  console.log(`\n--- ${step} ---`);

  function printNode(node: any, indent: string = '') {
    const status = node.active ? '[ACTIVE]' : node.completed ? '[COMPLETED]' : '[PENDING]';
    console.log(`${indent}${node.id} (${node.type}) ${status}`);
    console.log(`${indent}  label: "${node.label || 'NO LABEL'}"`);
    console.log(`${indent}  depth: ${node.depth}`);

    if (node.children && node.children.length > 0) {
      console.log(`${indent}  children (${node.children.length}):`);
      node.children.forEach((child: any) => {
        printNode(child, indent + '    ');
      });
    }
  }

  printNode(tree.root);
}

function simulateRecursiveContainerLogic(node: any, depth: number = 0, showOnlyActiveAndCompleted = false) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}🔍 Processing: ${node.id} (${node.type})`);

  if (node.type === 'group') {
    console.log(`${indent}   Label: "${node.label || 'NO LABEL'}"`);
    console.log(`${indent}   Children: ${node.children?.length || 0}`);

    if (!node.children || node.children.length === 0) {
      console.log(`${indent}   ❌ No children - would only show label if has label: ${!!node.label}`);
      return { wouldShow: !!node.label, reason: 'empty group with label' };
    }

    // Filter children based on visibility rules (from RecursiveGroupContainer)
    const visibleChildren = node.children.filter((child: any) => {
      if (showOnlyActiveAndCompleted) {
        return child.active || child.completed || child.visited;
      }

      // For static groups, show all discovered children
      if (node.flow === 'static') {
        return true;
      }

      // For root level (no flow), show first pending field
      if (!node.flow && node.id === 'root') {
        if (child.completed || child.active) {
          return true;
        }
        const siblings = node.children;
        const childIndex = siblings.indexOf(child);
        const allPreviousCompleted = siblings.slice(0, childIndex).every((prev: any) => prev.completed);
        return allPreviousCompleted;
      }

      // For progressive/phased groups, show completed, active, and the next pending field
      if (child.completed || child.active) {
        return true;
      }

      if (node.flow === 'progressive') {
        const siblings = node.children;
        const childIndex = siblings.indexOf(child);
        const allPreviousCompleted = siblings.slice(0, childIndex).every((prev: any) => prev.completed);
        return allPreviousCompleted;
      }

      return false;
    });

    console.log(`${indent}   Visible children: ${visibleChildren.length} of ${node.children.length}`);

    if (visibleChildren.length === 0) {
      console.log(`${indent}   ❌ No visible children - would only show label if has label: ${!!node.label}`);
      return { wouldShow: !!node.label, reason: 'no visible children but has label' };
    }

    // Check if this is a completed group
    if (node.completed && !node.active) {
      console.log(`${indent}   📋 Completed group - would show completed fields only`);
      const completedFields = visibleChildren.filter((child: any) =>
        child.type === 'field' && child.completed && !child.hideAfterSubmit
      );
      console.log(`${indent}   Completed fields: ${completedFields.length}`);

      if (completedFields.length === 0) {
        return { wouldShow: false, reason: 'completed group with no visible completed fields' };
      }

      return {
        wouldShow: true,
        reason: 'completed group with visible completed fields',
        showsLabel: !!node.label
      };
    }

    // For active/current groups
    console.log(`${indent}   ✅ Active group - would show label: ${!!node.label}`);

    // Process children
    visibleChildren.forEach((child: any) => {
      simulateRecursiveContainerLogic(child, depth + 1, showOnlyActiveAndCompleted);
    });

    return {
      wouldShow: true,
      reason: 'active group with visible children',
      showsLabel: !!node.label
    };
  }

  return { wouldShow: true, reason: 'field' };
}

console.log('Setting up scenario matching your example...');

// Create Group 1
const group1 = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};
adapter.addPromptRequestToTree(group1);

// Add fields to Group 1
const locationField = {
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
};
adapter.addPromptRequestToTree(locationField, 'group1');

const typeField = {
  type: 'select',
  id: 'type-field',
  label: 'Choose a type:',
  depth: 1
};
adapter.addPromptRequestToTree(typeField, 'group1');

const frameworkField = {
  type: 'select',
  id: 'framework-field',
  label: 'Select a framework:',
  depth: 1
};
adapter.addPromptRequestToTree(frameworkField, 'group1');

const templateField = {
  type: 'select',
  id: 'template-field',
  label: 'Choose a template:',
  depth: 1
};
adapter.addPromptRequestToTree(templateField, 'group1');

// Create Group 2 (nested under Group 1)
const group2 = {
  type: 'group',
  id: 'group2',
  label: 'Group 2',
  flow: 'progressive' as const,
  depth: 1
};
adapter.addPromptRequestToTree(group2, 'group1');

// Add fields to Group 2
const addonsField = {
  type: 'multi',
  id: 'addons-field',
  label: 'Choose addons:',
  depth: 2
};
adapter.addPromptRequestToTree(addonsField, 'group2');

const styleField = {
  type: 'select',
  id: 'style-field',
  label: 'Choose a style:',
  depth: 2
};
adapter.addPromptRequestToTree(styleField, 'group2');

logTreeStructureDetailed('Initial setup');

console.log('\n=== SIMULATING USER PROGRESSION ===');

// Complete fields in Group 1
treeManager.navigateTo('location-field');
treeManager.updateNode('location-field', { value: './my-plugin', completed: true });

treeManager.navigateTo('type-field');
treeManager.updateNode('type-field', { value: 'Plugin', completed: true });

treeManager.navigateTo('framework-field');
treeManager.updateNode('framework-field', { value: 'React', completed: true });

treeManager.navigateTo('template-field');
treeManager.updateNode('template-field', { value: 'Default', completed: true });

logTreeStructureDetailed('After completing Group 1 fields');

// Now navigate to Group 2 fields
treeManager.navigateTo('addons-field');
treeManager.updateNode('addons-field', { value: ['shadcn'], completed: true });

treeManager.navigateTo('style-field');
// Leave style-field active (as in your example)

logTreeStructureDetailed('After progressing to Group 2');

console.log('\n=== ANALYZING RECURSIVE CONTAINER BEHAVIOR ===');

const rootNode = treeManager.getTree().root;
console.log('\n🔍 Simulating RecursiveGroupContainer rendering logic:');
simulateRecursiveContainerLogic(rootNode);

console.log('\n=== SPECIFIC GROUP 2 ANALYSIS ===');

const group2Node = treeManager.getNode('group2');
if (group2Node) {
  console.log('\nGroup 2 detailed analysis:');
  console.log(`  Label: "${group2Node.label}"`);
  console.log(`  Active: ${group2Node.active}`);
  console.log(`  Completed: ${group2Node.completed}`);
  console.log(`  Visited: ${group2Node.visited}`);
  console.log(`  Children: ${group2Node.children?.length}`);

  if (group2Node.children) {
    console.log(`  Children states:`);
    group2Node.children.forEach((child: any) => {
      console.log(`    ${child.id}: active=${child.active}, completed=${child.completed}, visited=${child.visited}`);
    });
  }

  console.log('\n🎯 Group 2 should show label because:');
  console.log('  1. It has children');
  console.log('  2. At least one child is active or completed');
  console.log('  3. It has a label');

  const result = simulateRecursiveContainerLogic(group2Node, 0, false);
  console.log(`\nResult: ${JSON.stringify(result, null, 2)}`);
} else {
  console.log('\n❌ Group 2 not found in tree!');
}

console.log('\n🎉 Real scenario group labels test completed!');