// Debug utilities for the prompt tree during development
// These functions can be imported and used for debugging

import { PromptTreeManager } from './PromptTree.js';

export class PromptTreeDebugger {
  private treeManager: PromptTreeManager;

  constructor(treeManager: PromptTreeManager) {
    this.treeManager = treeManager;
  }

  // Print the entire tree structure
  printTree(): void {
    console.log('🌳 Prompt Tree Structure:');
    console.log(this.treeManager.printTree());
  }

  // Print tree statistics
  printStats(): void {
    const stats = this.treeManager.getTreeStats();
    console.log('📊 Tree Statistics:', {
      'Total Nodes': stats.totalNodes,
      'Completed Nodes': stats.completedNodes,
      'Visited Nodes': stats.visitedNodes,
      'Active Node': stats.activeNodeId || 'none',
      'Max Depth': stats.maxDepth
    });
  }

  // Print current active path
  printActivePath(): void {
    const history = this.treeManager.getNavigationPath();
    console.log('🛤️  Navigation History:');
    history.forEach((node, index) => {
      const prefix = index === history.length - 1 ? '→ ' : '  ';
      console.log(`${prefix}${node.id} (${node.type})`);
    });
  }

  // Print all field values
  printFieldValues(): void {
    const fields = this.treeManager.getNodesByType('field');
    console.log('💾 Field Values:');
    fields.forEach(field => {
      if (field.value !== undefined) {
        console.log(`  ${field.id}: ${JSON.stringify(field.value)}`);
      }
    });
  }

  // Print completion status
  printCompletionStatus(): void {
    const completed = this.treeManager.getCompletedNodes();
    const visited = this.treeManager.getVisitedNodes();

    console.log('✅ Completion Status:');
    console.log(`  Completed: ${completed.map(n => n.id).join(', ') || 'none'}`);
    console.log(`  Visited: ${visited.map(n => n.id).join(', ') || 'none'}`);
  }

  // Comprehensive debug output
  debugAll(): void {
    console.log('\n' + '='.repeat(50));
    console.log('🔍 PROMPT TREE DEBUG OUTPUT');
    console.log('='.repeat(50));

    this.printTree();
    console.log('');

    this.printStats();
    console.log('');

    this.printActivePath();
    console.log('');

    this.printFieldValues();
    console.log('');

    this.printCompletionStatus();

    console.log('='.repeat(50) + '\n');
  }

  // Validate tree integrity
  validateTree(): boolean {
    try {
      const tree = this.treeManager.getTree();
      let isValid = true;
      const issues: string[] = [];

      // Check that all nodes in index exist in tree
      this.treeManager.traverseDepthFirst(node => {
        const indexedNode = tree.nodeIndex.get(node.id);
        if (!indexedNode) {
          issues.push(`Node ${node.id} exists in tree but not in index`);
          isValid = false;
        }
      });

      // Check that all indexed nodes exist in tree
      for (const [id, node] of tree.nodeIndex) {
        if (id === 'root') continue; // Root is special

        let foundInTree = false;
        this.treeManager.traverseDepthFirst(treeNode => {
          if (treeNode.id === id) {
            foundInTree = true;
          }
        });

        if (!foundInTree) {
          issues.push(`Node ${id} exists in index but not in tree`);
          isValid = false;
        }
      }

      // Check parent-child relationships
      this.treeManager.traverseDepthFirst(node => {
        node.children.forEach(child => {
          if (child.parent !== node) {
            issues.push(`Child ${child.id} has incorrect parent reference`);
            isValid = false;
          }
        });
      });

      if (isValid) {
        console.log('✅ Tree validation passed');
      } else {
        console.log('❌ Tree validation failed:');
        issues.forEach(issue => console.log(`  - ${issue}`));
      }

      return isValid;

    } catch (error) {
      console.error('❌ Tree validation error:', error);
      return false;
    }
  }
}

// Convenience function to create debugger from tree manager
export function createDebugger(treeManager: PromptTreeManager): PromptTreeDebugger {
  return new PromptTreeDebugger(treeManager);
}