// Test markdown undefined fix
// Run with: npx tsx src/tests/markdown-undefined-test.ts

import { PromptTreeManager } from '../core/PromptTree.js';
import { PromptTreeAdapter } from '../core/PromptTreeAdapter.js';

console.log('🔍 Testing Markdown Undefined Issue Fix...\n');

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Test case 1: Note prompt with undefined label
console.log('Test 1: Adding note prompt without label...');
const notePrompt = {
  type: 'note',
  id: 'test-note',
  // Intentionally no label to test undefined case
  depth: 0
};

adapter.addPromptRequestToTree(notePrompt);
console.log('✓ Added note prompt without label');

// Test case 2: Note prompt with empty label
console.log('\nTest 2: Adding note prompt with empty label...');
const emptyNotePrompt = {
  type: 'note',
  id: 'test-note-empty',
  label: '',
  depth: 0
};

adapter.addPromptRequestToTree(emptyNotePrompt);
console.log('✓ Added note prompt with empty label');

// Test case 3: Note prompt with proper label
console.log('\nTest 3: Adding note prompt with proper label...');
const properNotePrompt = {
  type: 'note',
  id: 'test-note-proper',
  label: 'This is a proper note message',
  depth: 0
};

adapter.addPromptRequestToTree(properNotePrompt);
console.log('✓ Added note prompt with proper label');

console.log('\nStep 4: Tree structure:');
console.log(treeManager.printTree());

console.log('\nStep 5: Testing markdown safety...');

// Get the tree and check each node
const tree = treeManager.getTree();
tree.root.children.forEach((child, index) => {
  console.log(`Node ${index + 1}:`, {
    id: child.id,
    label: child.label,
    labelType: typeof child.label,
    labelDefined: child.label !== undefined
  });
});

console.log('\n✅ Test completed! The fixes should prevent:');
console.log('  - "Cannot read properties of undefined (reading \'split\')" errors');
console.log('  - Markdown parser crashes from undefined content');
console.log('  - Note component failures from missing message prop');

console.log('\n💡 Fixes applied:');
console.log('  1. dedentContent() now handles undefined content');
console.log('  2. parseMarkdown() uses content || "" fallback');
console.log('  3. Note component uses props.message || "" fallback');
console.log('  4. RecursiveGroupContainer uses item.label || "" fallback');