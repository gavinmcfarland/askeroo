// Adapter functions to bridge between old state management and new tree structure
// This enables gradual migration without breaking existing functionality

import { PromptNode, PromptTreeManager } from './PromptTree.js';

// Import existing types from PromptApp
interface PromptRequest {
  type: string;
  id: string;
  label?: string;
  groupName?: string;
  flow?: "progressive" | "phased" | "static";
  discoveredFields?: Array<{ id: string; label: string; type: string }>;
  enableArrowNavigation?: boolean;
  excludeFromCompleted?: boolean;
  hideAfterSubmit?: boolean;
  allowBack?: boolean;
  depth?: number;
  [key: string]: any;
}

interface FieldState {
  values: Record<string, any>;
  visited: Set<string>;
  completed: Set<string>;
  properties: Map<string, any>;
  messages: Record<string, string>;
  groupNames: Record<string, string>;
  groupIds: Record<string, string>;
}

interface GroupState {
  progressive: Set<string>;
  phased: Set<string>;
  static: Set<string>;
  completed: Set<string>;
  order: string[];
  arrowNavigation: Set<string>;
  depths: Map<string, number>;
}

interface PromptOrderState {
  root: Array<{ id: string; type: "field" | "group"; groupName?: string }>;
  rootFieldHistory: Array<{ id: string; label: string; type: string; hideAfterSubmit?: boolean }>;
  staticGroupFields: Map<string, Array<{ id: string; label: string; type: string; hideAfterSubmit?: boolean }>>;
  groupFieldHistory: Map<string, Array<{ id: string; label: string; type: string; hideAfterSubmit?: boolean }>>;
}

export class PromptTreeAdapter {
  private treeManager: PromptTreeManager;
  private groupIdToPromptId: Map<string, string> = new Map();

  constructor(treeManager: PromptTreeManager) {
    this.treeManager = treeManager;
  }

  // Convert PromptRequest to PromptNode and add to tree
  addPromptRequestToTree(request: PromptRequest, currentGroup?: string | null): PromptNode {
    if (request.type === 'group') {
      return this.addGroupToTree(request);
    } else {
      return this.addFieldToTree(request, currentGroup);
    }
  }

  private addGroupToTree(request: PromptRequest): PromptNode {
    // Find parent group if this is a nested group
    const parentGroupId = this.findParentGroupId(request);

    const groupNode = this.treeManager.addNode({
      id: request.id,
      type: 'group',
      label: request.label,
      completed: false,
      visited: false,
      active: false,
      depth: request.depth || 0,
      flow: request.flow || 'progressive',
      enableArrowNavigation: request.enableArrowNavigation,
      discoveredFields: request.discoveredFields,
      allowBack: request.allowBack,
      properties: { ...request }
    }, parentGroupId);

    return groupNode;
  }

  private addFieldToTree(request: PromptRequest, currentGroup?: string | null): PromptNode {
    // Determine parent - either the current group or root
    const parentId = currentGroup || 'root';

    const fieldNode = this.treeManager.addNode({
      id: request.id,
      type: 'field',
      label: request.label,
      fieldType: request.type,
      completed: false,
      visited: false,
      active: false,
      depth: request.depth || (currentGroup ? 1 : 0),
      hideAfterSubmit: request.hideAfterSubmit,
      excludeFromCompleted: request.excludeFromCompleted,
      allowBack: request.allowBack,
      groupName: request.groupName,
      properties: { ...request }
    }, parentId);

    return fieldNode;
  }

  private findParentGroupId(request: PromptRequest): string | undefined {
    // For now, assume groups are added in order and nested groups have depth > 0
    if (request.depth && request.depth > 0) {
      // Find the most recent group with depth = current depth - 1
      const tree = this.treeManager.getTree();
      const groups = this.treeManager.getNodesByType('group');

      // Find groups with depth one less than current
      const parentDepth = request.depth - 1;
      const potentialParents = groups.filter(g => g.depth === parentDepth);

      // Return the most recently added parent at the correct depth
      return potentialParents.length > 0
        ? potentialParents[potentialParents.length - 1].id
        : 'root';
    }

    return 'root';
  }

  // Sync tree state with old state objects (for gradual migration)
  syncTreeToOldState(): {
    fieldState: FieldState;
    groupState: GroupState;
    promptOrderState: PromptOrderState;
  } {
    const tree = this.treeManager.getTree();

    // Initialize old state structures
    const fieldState: FieldState = {
      values: {},
      visited: new Set(),
      completed: new Set(),
      properties: new Map(),
      messages: {},
      groupNames: {},
      groupIds: {}
    };

    const groupState: GroupState = {
      progressive: new Set(),
      phased: new Set(),
      static: new Set(),
      completed: new Set(),
      order: [],
      arrowNavigation: new Set(),
      depths: new Map()
    };

    const promptOrderState: PromptOrderState = {
      root: [],
      rootFieldHistory: [],
      staticGroupFields: new Map(),
      groupFieldHistory: new Map()
    };

    // Traverse tree and populate old state
    this.treeManager.traverseDepthFirst(node => {
      if (node.id === 'root') return;

      if (node.type === 'field') {
        // Populate field state
        if (node.value !== undefined) {
          fieldState.values[node.id] = node.value;
        }

        if (node.visited) {
          fieldState.visited.add(node.id);
        }

        if (node.completed) {
          fieldState.completed.add(node.id);
        }

        fieldState.properties.set(node.id, node.properties);
        fieldState.messages[node.id] = node.label || `${node.fieldType} field`;

        if (node.groupName) {
          fieldState.groupIds[node.id] = node.groupName;
          // Try to get group display name
          const groupNode = this.treeManager.getNode(node.groupName);
          if (groupNode?.label) {
            fieldState.groupNames[node.id] = groupNode.label;
          }
        }

        // Add to prompt order
        if (node.parent?.id === 'root') {
          promptOrderState.root.push({
            id: node.id,
            type: 'field',
            groupName: node.groupName
          });
        }

        // Add to field history
        const fieldInfo = {
          id: node.id,
          label: node.label || `${node.fieldType} field`,
          type: node.fieldType || 'unknown',
          hideAfterSubmit: node.hideAfterSubmit
        };

        if (node.parent?.type === 'group' && node.parent.id !== 'root') {
          // Add to group field history
          const groupId = node.parent.id;
          const existing = promptOrderState.groupFieldHistory.get(groupId) || [];
          if (!existing.some(f => f.id === node.id)) {
            promptOrderState.groupFieldHistory.set(groupId, [...existing, fieldInfo]);
          }

          // Add to static group fields if applicable
          if (node.parent.flow === 'static') {
            const staticFields = promptOrderState.staticGroupFields.get(groupId) || [];
            if (!staticFields.some(f => f.id === node.id)) {
              promptOrderState.staticGroupFields.set(groupId, [...staticFields, fieldInfo]);
            }
          }
        } else {
          // Add to root field history
          if (!promptOrderState.rootFieldHistory.some(f => f.id === node.id)) {
            promptOrderState.rootFieldHistory.push(fieldInfo);
          }
        }

      } else if (node.type === 'group') {
        // Populate group state
        if (node.flow === 'progressive') {
          groupState.progressive.add(node.id);
        } else if (node.flow === 'phased') {
          groupState.phased.add(node.id);
        } else if (node.flow === 'static') {
          groupState.static.add(node.id);
        }

        if (node.completed) {
          groupState.completed.add(node.id);
        }

        if (!groupState.order.includes(node.id)) {
          groupState.order.push(node.id);
        }

        if (node.enableArrowNavigation) {
          groupState.arrowNavigation.add(node.id);
        }

        groupState.depths.set(node.id, node.depth);

        // Add to prompt order if root-level group
        if (node.parent?.id === 'root') {
          promptOrderState.root.push({
            id: node.id,
            type: 'group',
            groupName: node.id
          });
        }
      }
    });

    return { fieldState, groupState, promptOrderState };
  }

  // Sync old state back to tree (for updates from old system)
  syncOldStateToTree(
    fieldState: FieldState,
    groupState: GroupState,
    currentGroup?: string | null,
    activePromptId?: string | null
  ): void {
    // Update field values and states
    for (const [fieldId, value] of Object.entries(fieldState.values)) {
      this.treeManager.updateNode(fieldId, { value });
    }

    // Update visited status
    fieldState.visited.forEach(fieldId => {
      this.treeManager.updateNode(fieldId, { visited: true });
    });

    // Update completed status
    fieldState.completed.forEach(fieldId => {
      this.treeManager.updateNode(fieldId, { completed: true });
    });

    // Update group completed status
    groupState.completed.forEach(groupId => {
      this.treeManager.updateNode(groupId, { completed: true });
    });

    // Update active node
    if (activePromptId) {
      // Deactivate all nodes first
      this.treeManager.traverseDepthFirst(node => {
        node.active = false;
      });

      // Activate the current prompt
      this.treeManager.updateNode(activePromptId, { active: true });

      // Update tree's active node reference
      const tree = this.treeManager.getTree();
      tree.activeNode = this.treeManager.getNode(activePromptId) || null;
    }
  }

  // Helper to create PromptRequest from PromptNode (for backward compatibility)
  createPromptRequestFromNode(node: PromptNode): PromptRequest {
    const request: PromptRequest = {
      ...node.properties,
      id: node.id,
      type: node.type === 'group' ? 'group' : node.fieldType || 'unknown',
      label: node.label,
      groupName: node.groupName,
      flow: node.flow,
      discoveredFields: node.discoveredFields,
      enableArrowNavigation: node.enableArrowNavigation,
      excludeFromCompleted: node.excludeFromCompleted,
      hideAfterSubmit: node.hideAfterSubmit,
      allowBack: node.allowBack,
      depth: node.depth
    };

    return request;
  }

  // Get current group from tree state
  getCurrentGroup(): string | null {
    const activeNode = this.treeManager.getActiveNode();
    if (!activeNode) return null;

    if (activeNode.type === 'group') {
      return activeNode.id;
    }

    // For field nodes, return their group
    const parentGroup = this.treeManager.findParentGroup(activeNode);
    return parentGroup?.id || null;
  }

  // Navigation helpers
  handleBackNavigation(): PromptRequest | null {
    const result = this.treeManager.goBack();
    if (result.success && result.node) {
      return this.createPromptRequestFromNode(result.node);
    }
    return null;
  }

  handleForwardNavigation(): PromptRequest | null {
    const nextNode = this.treeManager.findNextActiveNode();
    if (nextNode) {
      const result = this.treeManager.navigateTo(nextNode.id);
      if (result.success && result.node) {
        return this.createPromptRequestFromNode(result.node);
      }
    }
    return null;
  }

  // Debug utilities
  getTreeDebugInfo(): string {
    return this.treeManager.printTree();
  }

  getTreeStats() {
    return this.treeManager.getTreeStats();
  }
}