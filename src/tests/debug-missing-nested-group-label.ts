// Debug why nested group label is missing in the real scenario
// Run with: npx tsx src/tests/debug-missing-nested-group-label.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🐛 Debug Missing Nested Group Label...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

function debugRecursiveGroupLogic(node: any, level: number = 0, showOnlyActiveAndCompleted = false): any {
  const indent = '  '.repeat(level);
  const result = {
    nodeId: node.id,
    nodeType: node.type,
    label: node.label,
    wouldRender: false,
    wouldShowLabel: false,
    children: [] as any[],
    reason: ''
  };

  console.log(`${indent}🔍 ${node.id} (${node.type}) label="${node.label || 'NONE'}"`);

  if (node.type === 'group') {
    // Check empty group case
    if (!node.children || node.children.length === 0) {
      if (node.label) {
        console.log(`${indent}   ✅ Empty group with label -> RENDERS`);
        result.wouldRender = true;
        result.wouldShowLabel = true;
        result.reason = 'empty group with label';
        return result;
      }
      console.log(`${indent}   ❌ Empty group without label -> NO RENDER`);
      result.reason = 'empty group without label';
      return result;
    }

    // Filter visible children (exact logic from RecursiveGroupContainer)
    const visibleChildren = node.children.filter((child: any) => {
      if (showOnlyActiveAndCompleted) {
        return child.active || child.completed || child.visited;
      }

      if (node.flow === 'static') {
        return true;
      }

      if (!node.flow && node.id === 'root') {
        if (child.completed || child.active) {
          return true;
        }
        const siblings = node.children;
        const childIndex = siblings.indexOf(child);
        const allPreviousCompleted = siblings.slice(0, childIndex).every((prev: any) => prev.completed);
        return allPreviousCompleted;
      }

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

    console.log(`${indent}   Visible children: ${visibleChildren.length}/${node.children.length}`);

    if (visibleChildren.length === 0) {
      if (node.label) {
        console.log(`${indent}   ✅ No visible children but has label -> RENDERS`);
        result.wouldRender = true;
        result.wouldShowLabel = true;
        result.reason = 'no visible children but has label';
        return result;
      }
      console.log(`${indent}   ❌ No visible children, no label -> NO RENDER`);
      result.reason = 'no visible children, no label';
      return result;
    }

    // Check if completed group
    if (node.completed && !node.active) {
      console.log(`${indent}   📋 Completed group path`);
      const completedFields = visibleChildren.filter((child: any) =>
        child.type === 'field' && child.completed && !child.hideAfterSubmit
      );

      if (completedFields.length === 0) {
        console.log(`${indent}   ❌ Completed group with no visible completed fields -> NO RENDER`);
        result.reason = 'completed group with no visible completed fields';
        return result;
      }

      console.log(`${indent}   ✅ Completed group with ${completedFields.length} completed fields -> RENDERS`);
      result.wouldRender = true;
      result.wouldShowLabel = !!node.label;
      result.reason = 'completed group with visible completed fields';

      // Process completed fields
      completedFields.forEach((child: any) => {
        const childResult = debugRecursiveGroupLogic(child, level + 1, true);
        result.children.push(childResult);
      });

      return result;
    }

    // Active/current group path
    console.log(`${indent}   ✅ Active group -> RENDERS, shows label: ${!!node.label}`);
    result.wouldRender = true;
    result.wouldShowLabel = !!node.label;
    result.reason = 'active group with visible children';

    // Process all visible children
    visibleChildren.forEach((child: any) => {
      const childResult = debugRecursiveGroupLogic(child, level + 1, showOnlyActiveAndCompleted);
      result.children.push(childResult);
    });

    return result;
  }

  // Field node
  console.log(`${indent}   ✅ Field -> RENDERS`);
  result.wouldRender = true;
  result.reason = 'field';
  return result;
}

console.log('Creating exact structure from your example...');

// Root (no label, invisible)
// └── Group 1 (visible label)
//     ├── location-field (completed)
//     ├── type-field (completed)
//     ├── framework-field (completed)
//     ├── template-field (completed)
//     └── Group 2 (should show label)
//         ├── addons-field (completed)
//         └── style-field (active)

// Create Group 1
const group1 = {
  type: 'group',
  id: 'group1',
  label: 'Group 1',
  flow: 'progressive' as const,
  depth: 0
};
adapter.addPromptRequestToTree(group1);

// Add Group 1 fields
adapter.addPromptRequestToTree({
  type: 'text',
  id: 'location-field',
  label: 'Where should it be created?',
  depth: 1
}, 'group1');

adapter.addPromptRequestToTree({
  type: 'select',
  id: 'type-field',
  label: 'Choose a type:',
  depth: 1
}, 'group1');

adapter.addPromptRequestToTree({
  type: 'select',
  id: 'framework-field',
  label: 'Select a framework:',
  depth: 1
}, 'group1');

adapter.addPromptRequestToTree({
  type: 'select',
  id: 'template-field',
  label: 'Choose a template:',
  depth: 1
}, 'group1');

// Create Group 2 (nested in Group 1)
const group2 = {
  type: 'group',
  id: 'group2',
  label: 'Group 2',
  flow: 'progressive' as const,
  depth: 1
};
adapter.addPromptRequestToTree(group2, 'group1');

// Add Group 2 fields
adapter.addPromptRequestToTree({
  type: 'multi',
  id: 'addons-field',
  label: 'Choose addons:',
  depth: 2
}, 'group2');

adapter.addPromptRequestToTree({
  type: 'select',
  id: 'style-field',
  label: 'Choose a style:',
  depth: 2
}, 'group2');

// Set up the exact state from your example
console.log('\nSetting up state to match your example...');

// Complete Group 1 fields
treeManager.navigateTo('location-field');
treeManager.updateNode('location-field', { value: './my-plugin', completed: true });

treeManager.navigateTo('type-field');
treeManager.updateNode('type-field', { value: 'Plugin', completed: true });

treeManager.navigateTo('framework-field');
treeManager.updateNode('framework-field', { value: 'React', completed: true });

treeManager.navigateTo('template-field');
treeManager.updateNode('template-field', { value: 'Default', completed: true });

// Complete addons field, make style field active
treeManager.navigateTo('addons-field');
treeManager.updateNode('addons-field', { value: ['shadcn'], completed: true });

treeManager.navigateTo('style-field');
// style-field is now active

console.log('\n=== DEBUGGING RECURSIVE GROUP RENDERING ===');

const tree = treeManager.getTree();
console.log('\nStarting from root...');
const renderingResult = debugRecursiveGroupLogic(tree.root);

console.log('\n=== SUMMARY ===');

function printRenderingSummary(result: any, indent = '') {
  const labelInfo = result.wouldShowLabel ? `SHOWS LABEL "${result.label}"` : 'NO LABEL';
  const renderInfo = result.wouldRender ? '✅ RENDERS' : '❌ NO RENDER';

  console.log(`${indent}${result.nodeId} (${result.nodeType}): ${renderInfo} - ${labelInfo}`);
  console.log(`${indent}  Reason: ${result.reason}`);

  if (result.children.length > 0) {
    result.children.forEach((child: any) => {
      printRenderingSummary(child, indent + '  ');
    });
  }
}

printRenderingSummary(renderingResult);

console.log('\n🎯 Focus on Group 2:');
const group2Result = renderingResult.children.find((c: any) => c.nodeId === 'group2');
if (group2Result) {
  console.log(`Group 2 analysis:`);
  console.log(`  Would render: ${group2Result.wouldRender}`);
  console.log(`  Would show label: ${group2Result.wouldShowLabel}`);
  console.log(`  Reason: ${group2Result.reason}`);

  if (!group2Result.wouldShowLabel) {
    console.log('\n❌ FOUND THE ISSUE: Group 2 should show label but logic says it won\'t!');
  } else {
    console.log('\n✅ Logic says Group 2 should show label - issue might be elsewhere');
  }
} else {
  console.log('❌ Group 2 not found in rendering results!');
}

console.log('\n🐛 Debug completed!');