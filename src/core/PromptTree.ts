// Unified prompt tree structure for managing prompt state and navigation

export interface PromptNode {
  id: string;
  type: 'field' | 'group';

  // Content properties
  label?: string;
  fieldType?: string; // For field nodes: 'text', 'confirm', etc.

  // State properties
  value?: any;
  completed: boolean;
  visited: boolean;
  active: boolean;

  // Display properties
  hideAfterSubmit?: boolean;
  excludeFromCompleted?: boolean;
  depth: number;

  // Group-specific properties
  flow?: 'progressive' | 'phased' | 'static';
  enableArrowNavigation?: boolean;
  discoveredFields?: Array<{ id: string; label: string; type: string }>;

  // Tree structure
  children: PromptNode[];
  parent?: PromptNode;

  // Plugin properties (stored as-is from PromptRequest)
  properties: Record<string, any>;

  // Navigation properties
  allowBack?: boolean;
  groupName?: string; // For field nodes, which group they belong to
}

export interface PromptTree {
  root: PromptNode;
  activeNode: PromptNode | null;
  nodeIndex: Map<string, PromptNode>; // For O(1) lookups
  history: PromptNode[]; // Navigation history stack
}

export type NavigationDirection = 'back' | 'forward' | 'next';

export interface NavigationResult {
  success: boolean;
  node?: PromptNode;
  reason?: string;
}

export class PromptTreeManager {
  private tree: PromptTree;

  constructor() {
    // Initialize with empty root node
    const rootNode: PromptNode = {
      id: 'root',
      type: 'group',
      completed: false,
      visited: false,
      active: false,
      depth: 0,
      children: [],
      properties: {}
    };

    this.tree = {
      root: rootNode,
      activeNode: null,
      nodeIndex: new Map([['root', rootNode]]),
      history: []
    };
  }

  // Tree access
  getTree(): PromptTree {
    return this.tree;
  }

  getActiveNode(): PromptNode | null {
    return this.tree.activeNode;
  }

  getNode(id: string): PromptNode | undefined {
    return this.tree.nodeIndex.get(id);
  }

  // Tree building
  addNode(node: Omit<PromptNode, 'children' | 'parent'>, parentId?: string): PromptNode {
    // Check if node already exists
    const existingNode = this.tree.nodeIndex.get(node.id);
    if (existingNode) {
      return existingNode;
    }

    const newNode: PromptNode = {
      ...node,
      children: [],
      parent: undefined
    };

    // Find parent and add as child
    const parent = parentId ? this.tree.nodeIndex.get(parentId) : this.tree.root;
    if (parent) {
      newNode.parent = parent;
      // Use provided depth if available, otherwise calculate from parent
      newNode.depth = node.depth !== undefined ? node.depth : parent.depth + 1;
      parent.children.push(newNode);
    } else {
      // If specified parent doesn't exist, fall back to root
      if (parentId && parentId !== 'root') {
        console.warn(`PromptTree: Parent '${parentId}' not found for node '${node.id}', adding to root`);
      }

      if (node.id !== 'root') {
        newNode.parent = this.tree.root;
        newNode.depth = node.depth !== undefined ? node.depth : 1;
        this.tree.root.children.push(newNode);
      }
    }

    // Add to index after establishing parent relationship
    this.tree.nodeIndex.set(node.id, newNode);

    return newNode;
  }

  updateNode(id: string, updates: Partial<PromptNode>): boolean {
    const node = this.tree.nodeIndex.get(id);
    if (!node) return false;

    Object.assign(node, updates);
    return true;
  }

  // Navigation
  navigateTo(nodeId: string): NavigationResult {
    const node = this.tree.nodeIndex.get(nodeId);
    if (!node) {
      return { success: false, reason: `Node ${nodeId} not found` };
    }

    // Deactivate current active node
    if (this.tree.activeNode) {
      this.tree.activeNode.active = false;
    }

    // Activate new node
    node.active = true;
    node.visited = true;
    this.tree.activeNode = node;

    // Add to history if not already the last item
    const lastInHistory = this.tree.history[this.tree.history.length - 1];
    if (!lastInHistory || lastInHistory.id !== nodeId) {
      this.tree.history.push(node);
    }

    return { success: true, node };
  }

  goBack(): NavigationResult {
    if (this.tree.history.length <= 1) {
      return { success: false, reason: 'No previous node in history' };
    }

    // Get current and previous nodes
    const currentNode = this.tree.history.pop();
    const previousNode = this.tree.history[this.tree.history.length - 1];

    if (!previousNode) {
      // Restore current node to history if we can't go back
      if (currentNode) {
        this.tree.history.push(currentNode);
      }
      return { success: false, reason: 'No previous node available' };
    }

    // Check if navigation is allowed
    if (currentNode?.allowBack === false) {
      // Restore current node to history
      if (currentNode) {
        this.tree.history.push(currentNode);
      }
      return { success: false, reason: 'Navigation back not allowed from current node' };
    }

    // Clear future state: Remove all nodes that were added after the previous node
    this.clearFutureStateFrom(previousNode);

    // Activate previous node and reset its completed state (since user is going back to re-enter it)
    if (this.tree.activeNode) {
      this.tree.activeNode.active = false;
    }

    previousNode.active = true;
    previousNode.completed = false; // Reset completed state when going back to this node
    this.tree.activeNode = previousNode;

    return { success: true, node: previousNode };
  }

  canGoBack(): boolean {
    if (this.tree.history.length <= 1) return false;

    const currentNode = this.tree.activeNode;
    return currentNode?.allowBack !== false;
  }

  // Find next active node in tree traversal order
  findNextActiveNode(fromNode?: PromptNode): PromptNode | null {
    const startNode = fromNode || this.tree.activeNode;
    if (!startNode) return null;

    // For group nodes, go to first child
    if (startNode.type === 'group' && startNode.children.length > 0) {
      return startNode.children[0];
    }

    // For field nodes, find next sibling or parent's next sibling
    return this.findNextSibling(startNode) || this.findNextInParentChain(startNode);
  }

  private findNextSibling(node: PromptNode): PromptNode | null {
    if (!node.parent) return null;

    const siblings = node.parent.children;
    const currentIndex = siblings.indexOf(node);

    if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
      return siblings[currentIndex + 1];
    }

    return null;
  }

  private findNextInParentChain(node: PromptNode): PromptNode | null {
    let current = node.parent;

    while (current) {
      const nextSibling = this.findNextSibling(current);
      if (nextSibling) {
        return nextSibling;
      }
      current = current.parent;
    }

    return null;
  }

  private resetNodeAndDescendants(node: PromptNode): void {
    // Reset completion status but preserve visited status
    node.completed = false;
    node.active = false;
    // Note: We keep visited=true to maintain navigation history

    // First, collect all children to reset
    const childrenToReset = [...node.children];

    // Reset children recursively
    childrenToReset.forEach(child => this.resetNodeAndDescendants(child));

    // Remove children from tree structure (clear future state)
    // This ensures that when going back, future nodes are completely removed
    node.children.forEach(child => {
      // Remove from node index
      this.tree.nodeIndex.delete(child.id);
      // Clear parent reference
      child.parent = undefined;
    });

    // Clear children array
    node.children = [];
  }

  private removeNodeFromTree(node: PromptNode): void {
    // First remove all descendants recursively
    const childrenToRemove = [...node.children];
    childrenToRemove.forEach(child => this.removeNodeFromTree(child));

    // Remove from parent's children array
    if (node.parent) {
      const siblingIndex = node.parent.children.indexOf(node);
      if (siblingIndex >= 0) {
        node.parent.children.splice(siblingIndex, 1);
      }
    }

    // Remove from node index
    this.tree.nodeIndex.delete(node.id);

    // Clear parent reference
    node.parent = undefined;

    // Clear children array
    node.children = [];

    // If this was the active node, clear the reference
    if (this.tree.activeNode === node) {
      this.tree.activeNode = null;
    }
  }

  private clearFutureStateFrom(nodeToKeep: PromptNode): void {
    // Strategy: Find all nodes that were added "after" the nodeToKeep
    // We'll traverse the tree and identify nodes that should be removed

    // First, mark the nodeToKeep and all its ancestors as "should keep"
    const nodesToKeep = new Set<string>();
    let current: PromptNode | undefined = nodeToKeep;
    while (current) {
      nodesToKeep.add(current.id);
      current = current.parent;
    }

    // Find all nodes that were visited before nodeToKeep in the history
    const historyUpToNode = this.tree.history.slice(0, this.tree.history.indexOf(nodeToKeep) + 1);
    historyUpToNode.forEach(node => {
      nodesToKeep.add(node.id);
      // Also keep all ancestors of historical nodes
      let ancestor = node.parent;
      while (ancestor) {
        nodesToKeep.add(ancestor.id);
        ancestor = ancestor.parent;
      }
    });

    // Find all nodes that should be removed (not in nodesToKeep)
    const nodesToRemove: PromptNode[] = [];
    this.traverseDepthFirst(node => {
      if (node.id !== 'root' && !nodesToKeep.has(node.id)) {
        nodesToRemove.push(node);
      }
    });

    // Remove nodes in reverse order (children before parents)
    // Sort by depth (deepest first) to avoid removing parents before children
    nodesToRemove
      .sort((a, b) => b.depth - a.depth)
      .forEach(node => this.removeNodeFromTree(node));
  }

  // Group-specific operations
  findParentGroup(node: PromptNode): PromptNode | null {
    let current = node.parent;

    while (current) {
      if (current.type === 'group') {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  getGroupChildren(groupId: string): PromptNode[] {
    const group = this.tree.nodeIndex.get(groupId);
    if (!group || group.type !== 'group') return [];

    return group.children;
  }

  // Tree traversal utilities
  traverseDepthFirst(visitor: (node: PromptNode) => void, startNode?: PromptNode): void {
    const start = startNode || this.tree.root;

    visitor(start);
    start.children.forEach(child => this.traverseDepthFirst(visitor, child));
  }

  findNodes(predicate: (node: PromptNode) => boolean): PromptNode[] {
    const results: PromptNode[] = [];

    this.traverseDepthFirst(node => {
      if (predicate(node)) {
        results.push(node);
      }
    });

    return results;
  }

  // State queries
  getCompletedNodes(): PromptNode[] {
    return this.findNodes(node => node.completed);
  }

  getVisitedNodes(): PromptNode[] {
    return this.findNodes(node => node.visited);
  }

  getNodesByType(type: 'field' | 'group'): PromptNode[] {
    return this.findNodes(node => node.type === type);
  }

  getNodesByFieldType(fieldType: string): PromptNode[] {
    return this.findNodes(node => node.type === 'field' && node.fieldType === fieldType);
  }

  // Utility methods
  getNavigationPath(): PromptNode[] {
    return [...this.tree.history];
  }

  clearHistoryAfter(nodeId: string): void {
    const index = this.tree.history.findIndex(node => node.id === nodeId);
    if (index >= 0) {
      this.tree.history = this.tree.history.slice(0, index + 1);
    }
  }

  // Debug utilities
  printTree(node?: PromptNode, indent = 0): string {
    const current = node || this.tree.root;
    const prefix = '  '.repeat(indent);
    const status = current.active ? '[ACTIVE]' : current.completed ? '[COMPLETED]' : current.visited ? '[VISITED]' : '[PENDING]';

    let result = `${prefix}${current.id} (${current.type}) ${status}\n`;

    current.children.forEach(child => {
      result += this.printTree(child, indent + 1);
    });

    return result;
  }

  getTreeStats(): {
    totalNodes: number;
    completedNodes: number;
    visitedNodes: number;
    activeNodeId: string | null;
    maxDepth: number;
  } {
    let totalNodes = 0;
    let completedNodes = 0;
    let visitedNodes = 0;
    let maxDepth = 0;

    this.traverseDepthFirst(node => {
      totalNodes++;
      if (node.completed) completedNodes++;
      if (node.visited) visitedNodes++;
      maxDepth = Math.max(maxDepth, node.depth);
    });

    return {
      totalNodes,
      completedNodes,
      visitedNodes,
      activeNodeId: this.tree.activeNode?.id || null,
      maxDepth
    };
  }
}