// Unified prompt tree structure for managing prompt state and navigation

import { PromptRequest } from "../types/index.js";

export interface PromptNode {
	id: string;
	type: "field" | "group";

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
	flow?: "progressive" | "phased" | "static";
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

export type NavigationDirection = "back" | "forward" | "next";

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
			id: "root",
			type: "group",
			completed: false,
			visited: false,
			active: false,
			depth: 0,
			children: [],
			properties: {},
		};

		this.tree = {
			root: rootNode,
			activeNode: null,
			nodeIndex: new Map([["root", rootNode]]),
			history: [],
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
	addNode(
		node: Omit<PromptNode, "children" | "parent">,
		parentId?: string
	): PromptNode {
		// Check if node already exists
		const existingNode = this.tree.nodeIndex.get(node.id);
		if (existingNode) {
			return existingNode;
		}

		const newNode: PromptNode = {
			...node,
			children: [],
			parent: undefined,
		};

		// Find parent and add as child
		const parent = parentId
			? this.tree.nodeIndex.get(parentId)
			: this.tree.root;
		if (parent) {
			newNode.parent = parent;
			// Use provided depth if available, otherwise calculate from parent
			newNode.depth =
				node.depth !== undefined ? node.depth : parent.depth + 1;
			parent.children.push(newNode);
		} else {
			// If specified parent doesn't exist, fall back to root
			if (parentId && parentId !== "root") {
				console.warn(
					`PromptTree: Parent '${parentId}' not found for node '${node.id}', adding to root`
				);
			}

			if (node.id !== "root") {
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

		// Check if this is a value update that might affect conditional logic
		const isValueUpdate = updates.value !== undefined;
		const wasValueChanged = isValueUpdate && node.value !== updates.value;

		Object.assign(node, updates);

		// If this is a field value change, remove any future nodes that might be conditional
		// This handles the case where changing a field affects conditional groups
		if (wasValueChanged && node.type === "field") {
			this.clearAllNodesAddedAfterField(node);
		}

		return true;
	}

	// Navigation
	navigateTo(nodeId: string): NavigationResult {
		const node = this.tree.nodeIndex.get(nodeId);
		if (!node) {
			return { success: false, reason: `Node ${nodeId} not found` };
		}

		// CRITICAL FIX: Determine if we should clear future state
		// We should only clear future state when:
		// 1. The node was visited before (wasVisitedBefore)
		// 2. The node is NOT in the current history (meaning we're revisiting from a different path)
		// 3. The node is NOT a forward navigation within the same group/parent context
		const wasVisitedBefore = node.visited;
		const isInCurrentHistory = this.tree.history.some(
			(n) => n.id === nodeId
		);

		// Check if this is a valid forward navigation (not a conditional re-visit)
		// This includes:
		// - Forward navigation within same parent (field2 → field3 in same group)
		// - Forward navigation to parent context (field5 in nestedGroup → field6 in parentGroup)
		const isValidForwardNavigation = (() => {
			if (!this.tree.activeNode) return false;

			// Same parent, moving forward
			if (node.parent?.id === this.tree.activeNode.parent?.id) {
				const siblings = node.parent?.children || [];
				const activeIndex = siblings.indexOf(this.tree.activeNode);
				const nodeIndex = siblings.indexOf(node);
				return nodeIndex > activeIndex;
			}

			// Moving from deeper nesting to shallower (leaving nested group)
			// This is valid forward navigation if the node is a sibling of an ancestor
			if (node.depth < this.tree.activeNode.depth) {
				// Check if node's parent is an ancestor of active node
				let ancestor = this.tree.activeNode.parent;
				while (ancestor) {
					if (ancestor.id === node.parent?.id) {
						// The target node is a sibling of our ancestor
						// This is valid forward navigation (leaving nested group)
						return true;
					}
					ancestor = ancestor.parent;
				}
			}

			return false;
		})();

		// Only clear future state for true re-navigation from different paths
		// NOT for valid forward navigation
		if (
			wasVisitedBefore &&
			!isInCurrentHistory &&
			!isValidForwardNavigation
		) {
			// Clear any nodes that might have been added after this node in previous flows
			// but are no longer part of the current valid flow
			// This should only happen for conditional branches or when replaying the flow
			this.clearFutureStateFrom(node);
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
			return { success: false, reason: "No previous node in history" };
		}

		// Get current and previous nodes
		const currentNode = this.tree.history.pop();
		const previousNode = this.tree.history[this.tree.history.length - 1];

		if (!previousNode) {
			// Restore current node to history if we can't go back
			if (currentNode) {
				this.tree.history.push(currentNode);
			}
			return { success: false, reason: "No previous node available" };
		}

		// Check if navigation is allowed
		if (currentNode?.allowBack === false) {
			// Restore current node to history
			if (currentNode) {
				this.tree.history.push(currentNode);
			}
			return {
				success: false,
				reason: "Navigation back not allowed from current node",
			};
		}

		// Activate previous node first so cleanup methods know which node to preserve
		if (this.tree.activeNode) {
			this.tree.activeNode.active = false;
		}

		previousNode.active = true;
		previousNode.completed = false; // Reset completed state when going back to this node
		this.tree.activeNode = previousNode;

		// Clear future state: Remove all nodes that were added after the previous node
		this.clearFutureStateFrom(previousNode);

		// TODO: Add more targeted conditional group cleanup here if needed
		// For now, rely on the application logic to not add conditional groups when conditions aren't met

		return { success: true, node: previousNode };
	}

	/**
	 * Clear all fields in a group and go back
	 * Used when user wants to clear a group and navigate back
	 */
	clearGroupAndGoBack(fieldId: string): NavigationResult {
		const fieldNode = this.getNode(fieldId);
		if (!fieldNode || fieldNode.type !== "field") {
			return { success: false, reason: "Field not found" };
		}

		const groupNode = fieldNode.parent;
		if (
			!groupNode ||
			groupNode.type !== "group" ||
			groupNode.id === "root"
		) {
			return { success: false, reason: "Field is not in a group" };
		}

		// Remove all children from the group
		const childrenToRemove = [...groupNode.children];
		childrenToRemove.forEach((child) => {
			this.removeNodeFromTree(child);
		});

		// Navigate back
		return this.goBack();
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
		if (startNode.type === "group" && startNode.children.length > 0) {
			return startNode.children[0];
		}

		// For field nodes, find next sibling or parent's next sibling
		return (
			this.findNextSibling(startNode) ||
			this.findNextInParentChain(startNode)
		);
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
		childrenToReset.forEach((child) => this.resetNodeAndDescendants(child));

		// Remove children from tree structure (clear future state)
		// This ensures that when going back, future nodes are completely removed
		node.children.forEach((child) => {
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
		childrenToRemove.forEach((child) => this.removeNodeFromTree(child));

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

	// Public method to clear future state from a specific node (e.g., when field value changes)
	clearFutureStateFromNode(node: PromptNode): void {
		this.clearFutureStateFrom(node);
	}

	// More aggressive cleanup: remove ALL nodes that were added after this field was first visited
	// This is specifically for handling conditional groups that depend on field values
	clearAllNodesAddedAfterField(field: PromptNode): void {
		// Find when this field was first added to history
		const firstVisitIndex = this.tree.history.findIndex(
			(n) => n.id === field.id
		);

		if (firstVisitIndex === -1) {
			// Field not in history, just clear everything after it structurally
			this.clearFutureStateFrom(field);
			return;
		}

		// Remove all nodes that were added to the tree AFTER this field was first visited
		// This includes conditional groups that were added based on this field's value
		const nodesToKeep = new Set<string>();
		nodesToKeep.add("root");

		// Keep the field itself and all nodes that were in history before or at the time this field was visited
		const historyUpToField = this.tree.history.slice(
			0,
			firstVisitIndex + 1
		);
		historyUpToField.forEach((node) => {
			nodesToKeep.add(node.id);
			// Keep ancestors
			let ancestor = node.parent;
			while (ancestor) {
				nodesToKeep.add(ancestor.id);
				ancestor = ancestor.parent;
			}
		});

		// CRITICAL FIX: Also preserve all root-level children that were completed before this field
		// This is the same fix as in clearFutureStateFrom
		const rootChildren = this.tree.root.children;
		rootChildren.forEach((rootChild) => {
			// If this root child was visited before or at the field, keep it
			const childIndex = this.tree.history.indexOf(rootChild);
			if (childIndex !== -1 && childIndex <= firstVisitIndex) {
				nodesToKeep.add(rootChild.id);
				// Keep all descendants of this root child
				this.traverseDepthFirst((descendant) => {
					nodesToKeep.add(descendant.id);
				}, rootChild);
			}
		});

		// Remove all other nodes
		const nodesToRemove: PromptNode[] = [];
		this.traverseDepthFirst((node) => {
			if (node.id !== "root" && !nodesToKeep.has(node.id)) {
				nodesToRemove.push(node);
			}
		});

		// Remove nodes in reverse depth order
		nodesToRemove
			.sort((a, b) => b.depth - a.depth)
			.forEach((node) => this.removeNodeFromTree(node));

		// Clean up history - remove any nodes after the field
		this.tree.history = this.tree.history.slice(0, firstVisitIndex + 1);

		// Make sure the field is active
		if (this.tree.activeNode) {
			this.tree.activeNode.active = false;
		}
		field.active = true;
		this.tree.activeNode = field;
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

		// Find the index of nodeToKeep in history to determine what came before it
		const nodeToKeepIndex = this.tree.history.indexOf(nodeToKeep);

		// Keep all nodes that were visited before or at the nodeToKeep in history
		// This ensures we preserve root-level fields that came before groups
		const historyUpToNode = this.tree.history.slice(0, nodeToKeepIndex + 1);
		historyUpToNode.forEach((node) => {
			nodesToKeep.add(node.id);
			// Also keep all ancestors of historical nodes
			let ancestor = node.parent;
			while (ancestor) {
				nodesToKeep.add(ancestor.id);
				ancestor = ancestor.parent;
			}
		});

		// IMPROVED: Preserve root-level children, but only their descendants that were in history before nodeToKeep
		// This ensures that root-level fields don't disappear, but also doesn't keep future fields
		const rootChildren = this.tree.root.children;
		rootChildren.forEach((rootChild) => {
			// If this root child was visited before or at the nodeToKeep, keep it
			const childIndex = this.tree.history.indexOf(rootChild);
			if (childIndex !== -1 && childIndex <= nodeToKeepIndex) {
				nodesToKeep.add(rootChild.id);
				// Only keep descendants that were actually in history before or at nodeToKeep
				this.traverseDepthFirst((descendant) => {
					const descendantIndex =
						this.tree.history.indexOf(descendant);
					if (
						descendantIndex !== -1 &&
						descendantIndex <= nodeToKeepIndex
					) {
						nodesToKeep.add(descendant.id);
					}
				}, rootChild);
			}
		});

		// IMPROVED: Only keep group nodes and their children that are in the valid history path
		// This allows conditional groups to be properly removed when their conditions are no longer met
		this.traverseDepthFirst((node) => {
			if (node.type === "group") {
				// Preserve groups that are either:
				// 1. Already marked to keep (in the path to nodeToKeep or in valid history)
				// 2. Have children that are marked to keep
				const shouldKeepGroup =
					nodesToKeep.has(node.id) ||
					node.children.some((child) => nodesToKeep.has(child.id));

				if (shouldKeepGroup) {
					// Keep the group node itself
					nodesToKeep.add(node.id);

					// Keep only the children that are in the valid history
					node.children.forEach((child) => {
						// Only keep children that are already marked as "should keep"
						if (nodesToKeep.has(child.id)) {
							// Keep descendants, but only those in valid history
							this.traverseDepthFirst((descendant) => {
								const descendantIndex =
									this.tree.history.indexOf(descendant);
								if (
									descendantIndex !== -1 &&
									descendantIndex <= nodeToKeepIndex
								) {
									nodesToKeep.add(descendant.id);
								}
							}, child);
						}
					});
				}
			}
		});

		// Find all nodes that should be removed (not in nodesToKeep)
		const nodesToRemove: PromptNode[] = [];
		this.traverseDepthFirst((node) => {
			if (node.id !== "root" && !nodesToKeep.has(node.id)) {
				nodesToRemove.push(node);
			}
		});

		// Remove nodes in reverse order (children before parents)
		// Sort by depth (deepest first) to avoid removing parents before children
		nodesToRemove
			.sort((a, b) => b.depth - a.depth)
			.forEach((node) => this.removeNodeFromTree(node));
	}

	// Remove conditional groups that are no longer valid based on current field values
	// This should be called when a field value changes that affects conditional logic
	removeInvalidConditionalGroups(fieldId: string, newValue: any): void {
		// This is where we could add logic to remove specific conditional groups
		// based on the changed field value, but this requires knowledge of the
		// application's conditional logic.

		// For now, this is a placeholder for more targeted conditional group removal
		// The application layer should handle this by not adding groups when conditions aren't met
		console.log(
			`Field ${fieldId} changed to ${newValue}, checking for conditional groups to remove...`
		);
	}

	// Clear nodes that are no longer reachable from the current flow state
	// This is useful for conditional groups that should be removed when their conditions are no longer met
	clearUnreachableNodes(): void {
		// Strategy: Only keep nodes that are ancestors or direct siblings of the active node
		// This is aggressive and will remove all conditional branches that are not in the current path

		const reachableNodes = new Set<string>();
		reachableNodes.add("root"); // Root is always reachable

		// Mark the direct path to the active node as reachable
		if (this.tree.activeNode) {
			let current: PromptNode | undefined = this.tree.activeNode;
			while (current) {
				reachableNodes.add(current.id);
				current = current.parent;
			}
		}

		// Find nodes that are not reachable
		const nodesToRemove: PromptNode[] = [];
		this.traverseDepthFirst((node) => {
			if (node.id !== "root" && !reachableNodes.has(node.id)) {
				nodesToRemove.push(node);
			}
		});

		// Remove unreachable nodes
		nodesToRemove
			.sort((a, b) => b.depth - a.depth) // Remove deepest first
			.forEach((node) => this.removeNodeFromTree(node));
	}

	// Group-specific operations
	findParentGroup(node: PromptNode): PromptNode | null {
		let current = node.parent;

		while (current) {
			if (current.type === "group") {
				return current;
			}
			current = current.parent;
		}

		return null;
	}

	getGroupChildren(groupId: string): PromptNode[] {
		const group = this.tree.nodeIndex.get(groupId);
		if (!group || group.type !== "group") return [];

		return group.children;
	}

	// Tree traversal utilities
	traverseDepthFirst(
		visitor: (node: PromptNode) => void,
		startNode?: PromptNode
	): void {
		const start = startNode || this.tree.root;

		visitor(start);
		start.children.forEach((child) =>
			this.traverseDepthFirst(visitor, child)
		);
	}

	findNodes(predicate: (node: PromptNode) => boolean): PromptNode[] {
		const results: PromptNode[] = [];

		this.traverseDepthFirst((node) => {
			if (predicate(node)) {
				results.push(node);
			}
		});

		return results;
	}

	// State queries
	getCompletedNodes(): PromptNode[] {
		return this.findNodes((node) => node.completed);
	}

	getVisitedNodes(): PromptNode[] {
		return this.findNodes((node) => node.visited);
	}

	getNodesByType(type: "field" | "group"): PromptNode[] {
		return this.findNodes((node) => node.type === type);
	}

	getNodesByFieldType(fieldType: string): PromptNode[] {
		return this.findNodes(
			(node) => node.type === "field" && node.fieldType === fieldType
		);
	}

	// Utility methods
	getNavigationPath(): PromptNode[] {
		return [...this.tree.history];
	}

	clearHistoryAfter(nodeId: string): void {
		const index = this.tree.history.findIndex((node) => node.id === nodeId);
		if (index >= 0) {
			this.tree.history = this.tree.history.slice(0, index + 1);
		}
	}

	// ========== Direct PromptRequest Handling ==========
	// These methods eliminate the need for PromptTreeAdapter

	addPromptRequest(
		request: PromptRequest,
		currentGroupId?: string | null
	): PromptNode {
		if (request.type === "group") {
			return this.addGroupRequest(request, currentGroupId);
		} else {
			return this.addFieldRequest(request, currentGroupId);
		}
	}

	private addGroupRequest(
		request: PromptRequest,
		currentGroupId?: string | null
	): PromptNode {
		let parentGroupId: string | undefined;

		if (currentGroupId && currentGroupId !== "root") {
			const parentExists = this.getNode(currentGroupId);
			if (parentExists) {
				parentGroupId = currentGroupId;
			} else {
				parentGroupId = this.findParentGroupIdByDepth(
					request.depth || 0
				);
			}
		} else {
			parentGroupId = this.findParentGroupIdByDepth(request.depth || 0);
		}

		// CRITICAL FIX: Don't pass depth if not explicitly set in request
		// Let addNode calculate it from parent to ensure correct nesting depths
		const groupNodeData: any = {
			id: request.id,
			type: "group",
			label: request.label,
			completed: false,
			visited: false,
			active: false,
			flow: request.flow || "progressive",
			enableArrowNavigation: request.enableArrowNavigation,
			discoveredFields: request.discoveredFields,
			allowBack: request.allowBack,
			properties: { ...request },
		};

		// Only include depth if explicitly provided, otherwise let addNode calculate it
		if (request.depth !== undefined) {
			groupNodeData.depth = request.depth;
		}

		const groupNode = this.addNode(groupNodeData, parentGroupId);

		return groupNode;
	}

	private addFieldRequest(
		request: PromptRequest,
		currentGroupId?: string | null
	): PromptNode {
		let parentId: string = "root";

		if (currentGroupId && currentGroupId !== "root") {
			const parentExists = this.getNode(currentGroupId);
			if (parentExists) {
				parentId = currentGroupId;
			}
		}

		const parentNode = this.getNode(parentId);
		const calculatedDepth = parentNode ? parentNode.depth + 1 : 1;

		const fieldNode = this.addNode(
			{
				id: request.id,
				type: "field",
				label: request.label,
				fieldType: request.type,
				completed: false,
				visited: false,
				active: false,
				depth: calculatedDepth,
				hideAfterSubmit: request.hideAfterSubmit,
				excludeFromCompleted: request.excludeFromCompleted,
				allowBack: request.allowBack,
				groupName: request.groupName,
				properties: { ...request },
			},
			parentId
		);

		return fieldNode;
	}

	private findParentGroupIdByDepth(requestDepth: number): string | undefined {
		if (requestDepth <= 0) return undefined;

		const parentDepth = requestDepth - 1;
		const activeNode = this.getActiveNode();

		if (activeNode) {
			let current: PromptNode | undefined = activeNode;
			while (current) {
				if (current.type === "group" && current.depth === parentDepth) {
					return current.id;
				}
				const parentGroup = this.findParentGroup(current);
				if (parentGroup && parentGroup.depth === parentDepth) {
					return parentGroup.id;
				}
				current = current.parent;
			}
		}

		const groups = this.getNodesByType("group");
		const potentialParents = groups.filter((g) => g.depth === parentDepth);

		if (potentialParents.length === 1) {
			return potentialParents[0].id;
		} else if (potentialParents.length > 1) {
			const history = this.getNavigationPath();
			for (let i = history.length - 1; i >= 0; i--) {
				const historyNode = history[i];
				if (
					historyNode.type === "group" &&
					historyNode.depth === parentDepth
				) {
					return historyNode.id;
				}
				const parentGroup = this.findParentGroup(historyNode);
				if (parentGroup && parentGroup.depth === parentDepth) {
					return parentGroup.id;
				}
			}
			return potentialParents[potentialParents.length - 1].id;
		}

		return "root";
	}

	getCurrentGroupId(): string | null {
		const activeNode = this.getActiveNode();
		if (!activeNode) return null;

		if (activeNode.type === "group") {
			return activeNode.id;
		}

		const parentGroup = this.findParentGroup(activeNode);
		return parentGroup?.id || null;
	}

	// ========== State Synchronization ==========
	// Sync tree to legacy state format (for plugins that still need it)

	// syncToLegacyState() has been removed - use direct tree access instead
	// Use treeManager.traverseDepthFirst() and node properties to access state
}
