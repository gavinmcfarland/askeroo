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
	nodeIndex: Map<string, PromptNode>; // For O(1) lookups
	history: PromptNode[]; // Navigation history stack (last item = active node)
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
			nodeIndex: new Map([["root", rootNode]]),
			history: [],
		};
	}

	// Tree access
	getTree(): PromptTree {
		return this.tree;
	}

	getActiveNode(): PromptNode | null {
		// Active node is always the last item in history
		// This eliminates the need for a separate activeNode pointer
		return this.tree.history.length > 0
			? this.tree.history[this.tree.history.length - 1]
			: null;
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

	// ========== NAVIGATION ==========

	navigateTo(nodeId: string): NavigationResult {
		const node = this.tree.nodeIndex.get(nodeId);
		if (!node) {
			return { success: false, reason: `Node ${nodeId} not found` };
		}

		// Clean up if we're revisiting from a different path
		if (this.shouldClearStateOnNavigateTo(node)) {
			this.clearFutureStateFrom(node);
		}

		// Activate the target node
		this.activateNode(node);

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
		const currentActive = this.getActiveNode();
		if (currentActive) {
			currentActive.active = false;
		}

		previousNode.active = true;
		previousNode.completed = false; // Reset completed state when going back to this node
		// Note: previousNode is already the last item in history after pop()

		// Clear future state: Remove all nodes that were added after the previous node
		this.clearFutureStateFrom(previousNode);

		return { success: true, node: previousNode };
	}

	// ========== NAVIGATION HELPER METHODS ==========

	/** Determine if we should clear state when navigating to a node */
	private shouldClearStateOnNavigateTo(node: PromptNode): boolean {
		// Already in history = same path, no cleanup needed
		if (this.tree.history.includes(node)) return false;

		// Not visited before = first time, no cleanup needed
		if (!node.visited) return false;

		// Forward navigation = not a revisit, no cleanup needed
		if (this.isForwardNavigation(node)) return false;

		// Everything else is a revisit from different path = cleanup needed
		return true;
	}

	/** Check if navigating to this node is forward navigation */
	private isForwardNavigation(node: PromptNode): boolean {
		const active = this.getActiveNode();
		if (!active) return true; // No active node = treat as forward

		// Same parent, check sibling order
		if (node.parent === active.parent) {
			const siblings = node.parent?.children || this.tree.root.children;
			const activeIndex = siblings.indexOf(active);
			const nodeIndex = siblings.indexOf(node);
			return nodeIndex > activeIndex;
		}

		// Moving to shallower depth (leaving nested group)
		if (node.depth < active.depth) {
			return this.isAncestorSibling(node, active);
		}

		return false;
	}

	/** Check if node is a sibling of an ancestor of active */
	private isAncestorSibling(node: PromptNode, active: PromptNode): boolean {
		let ancestor = active.parent;
		while (ancestor) {
			if (ancestor.id === node.parent?.id) {
				// Target node is a sibling of our ancestor
				return true;
			}
			ancestor = ancestor.parent;
		}
		return false;
	}

	/** Activate a node (handles deactivation and history tracking) */
	private activateNode(node: PromptNode): void {
		// Deactivate current active node
		const currentActive = this.getActiveNode();
		if (currentActive) {
			currentActive.active = false;
		}

		// Activate new node
		node.active = true;
		node.visited = true;

		// Add to history if not already the last item
		const lastInHistory = this.tree.history[this.tree.history.length - 1];
		if (!lastInHistory || lastInHistory.id !== node.id) {
			this.tree.history.push(node);
		}
		// Note: activeNode is now implicitly the last item in history
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

		const currentNode = this.getActiveNode();
		return currentNode?.allowBack !== false;
	}

	// Find next active node in tree traversal order
	findNextActiveNode(fromNode?: PromptNode): PromptNode | null {
		const startNode = fromNode || this.getActiveNode();
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

		// If this was the active node, remove from history
		const activeNode = this.getActiveNode();
		if (activeNode === node) {
			this.tree.history.pop();
		}
	}

	// ========== UNIFIED NODE CLEANUP SYSTEM ==========
	// Consolidated from 3 separate functions into a single, clear strategy-based approach

	/**
	 * Unified node cleanup with different strategies
	 * @param strategy - What to clean up:
	 *   - 'from-node': Remove nodes after a specific node (for back navigation)
	 *   - 'after-first-visit': Remove nodes added after field's first visit (for value changes)
	 *   - 'unreachable': Remove nodes not in active path (aggressive cleanup)
	 * @param options - Context for cleanup
	 */
	private cleanupNodes(
		strategy: "from-node" | "after-first-visit" | "unreachable",
		options: {
			node?: PromptNode;
			cleanupHistory?: boolean;
			setActive?: boolean;
		} = {}
	): void {
		const { node, cleanupHistory = false, setActive = false } = options;

		const nodesToKeep = new Set<string>(["root"]);

		// Build keep set based on strategy
		switch (strategy) {
			case "from-node": {
				if (!node)
					throw new Error("Node required for 'from-node' strategy");
				// Keep the node, its ancestors, and everything in history up to it
				this.markPathToRoot(node, nodesToKeep);
				this.markHistoryUpToNode(node, nodesToKeep);
				this.markRootLevelNodesInHistory(node, nodesToKeep);
				this.markGroupsWithValidChildren(node, nodesToKeep);
				break;
			}

			case "after-first-visit": {
				if (!node)
					throw new Error(
						"Node required for 'after-first-visit' strategy"
					);
				// Similar to from-node, but uses first visit index
				const firstVisitIndex = this.tree.history.findIndex(
					(n) => n.id === node.id
				);
				if (firstVisitIndex === -1) {
					// Fall back to from-node strategy
					this.markPathToRoot(node, nodesToKeep);
					this.markHistoryUpToNode(node, nodesToKeep);
					this.markRootLevelNodesInHistory(node, nodesToKeep);
					break;
				}

				// Keep everything up to first visit
				const historyUpToFirstVisit = this.tree.history.slice(
					0,
					firstVisitIndex + 1
				);
				historyUpToFirstVisit.forEach((n) => {
					this.markPathToRoot(n, nodesToKeep);
				});
				this.markRootLevelNodesBeforeIndex(
					firstVisitIndex,
					nodesToKeep
				);
				break;
			}

			case "unreachable": {
				// Only keep path to active node
				const activeNode = this.getActiveNode();
				if (activeNode) {
					this.markPathToRoot(activeNode, nodesToKeep);
				}
				break;
			}
		}

		// Remove nodes not in keep set
		this.removeNodesExcept(nodesToKeep);

		// Optional: cleanup history array
		if (cleanupHistory && node) {
			const keepIndex = this.tree.history.indexOf(node);
			if (keepIndex !== -1) {
				this.tree.history = this.tree.history.slice(0, keepIndex + 1);
			}
		}

		// Optional: set node as active
		if (setActive && node) {
			const currentActive = this.getActiveNode();
			if (currentActive) {
				currentActive.active = false;
			}
			node.active = true;
			// Add to history to make it active
			const lastInHistory =
				this.tree.history[this.tree.history.length - 1];
			if (!lastInHistory || lastInHistory.id !== node.id) {
				this.tree.history.push(node);
			}
		}
	}

	// ========== HELPER METHODS FOR CLEANUP ==========

	/** Mark a node and all its ancestors as "should keep" */
	private markPathToRoot(node: PromptNode, keepSet: Set<string>): void {
		let current: PromptNode | undefined = node;
		while (current) {
			keepSet.add(current.id);
			current = current.parent;
		}
	}

	/** Mark all nodes in history up to (and including) a specific node */
	private markHistoryUpToNode(node: PromptNode, keepSet: Set<string>): void {
		const nodeIndex = this.tree.history.indexOf(node);
		if (nodeIndex === -1) return;

		const historySlice = this.tree.history.slice(0, nodeIndex + 1);
		historySlice.forEach((n) => {
			this.markPathToRoot(n, keepSet);
		});
	}

	/** Mark root-level nodes that appear in history before the given node */
	private markRootLevelNodesInHistory(
		node: PromptNode,
		keepSet: Set<string>
	): void {
		const nodeIndex = this.tree.history.indexOf(node);
		if (nodeIndex === -1) return;

		this.tree.root.children.forEach((rootChild) => {
			const childIndex = this.tree.history.indexOf(rootChild);
			if (childIndex !== -1 && childIndex <= nodeIndex) {
				keepSet.add(rootChild.id);
				// Keep descendants that were in history before node
				this.traverseDepthFirst((descendant) => {
					const descIndex = this.tree.history.indexOf(descendant);
					if (descIndex !== -1 && descIndex <= nodeIndex) {
						keepSet.add(descendant.id);
					}
				}, rootChild);
			}
		});
	}

	/** Mark root-level nodes that appear in history before a specific index */
	private markRootLevelNodesBeforeIndex(
		historyIndex: number,
		keepSet: Set<string>
	): void {
		this.tree.root.children.forEach((rootChild) => {
			const childIndex = this.tree.history.indexOf(rootChild);
			if (childIndex !== -1 && childIndex <= historyIndex) {
				keepSet.add(rootChild.id);
				// Keep all descendants
				this.traverseDepthFirst((descendant) => {
					keepSet.add(descendant.id);
				}, rootChild);
			}
		});
	}

	/** Mark group nodes that have children we're keeping */
	private markGroupsWithValidChildren(
		node: PromptNode,
		keepSet: Set<string>
	): void {
		const nodeIndex = this.tree.history.indexOf(node);
		if (nodeIndex === -1) return;

		this.traverseDepthFirst((n) => {
			if (n.type === "group") {
				const shouldKeep =
					keepSet.has(n.id) ||
					n.children.some((child) => keepSet.has(child.id));

				if (shouldKeep) {
					keepSet.add(n.id);
					// Keep valid children and their descendants
					n.children.forEach((child) => {
						if (keepSet.has(child.id)) {
							this.traverseDepthFirst((desc) => {
								const descIndex =
									this.tree.history.indexOf(desc);
								if (
									descIndex !== -1 &&
									descIndex <= nodeIndex
								) {
									keepSet.add(desc.id);
								}
							}, child);
						}
					});
				}
			}
		});
	}

	/** Remove all nodes except those in the keep set */
	private removeNodesExcept(keepSet: Set<string>): void {
		const nodesToRemove: PromptNode[] = [];

		this.traverseDepthFirst((node) => {
			if (node.id !== "root" && !keepSet.has(node.id)) {
				nodesToRemove.push(node);
			}
		});

		// Remove deepest nodes first to maintain tree integrity
		nodesToRemove
			.sort((a, b) => b.depth - a.depth)
			.forEach((node) => this.removeNodeFromTree(node));
	}

	// ========== PUBLIC CLEANUP METHODS ==========

	/** Public method to clear future state from a specific node (for back navigation) */
	clearFutureStateFromNode(node: PromptNode): void {
		this.cleanupNodes("from-node", { node });
	}

	/** Remove ALL nodes added after a field's first visit (for value changes) */
	clearAllNodesAddedAfterField(field: PromptNode): void {
		this.cleanupNodes("after-first-visit", {
			node: field,
			cleanupHistory: true,
			setActive: true,
		});
	}

	/** Clear nodes that are no longer reachable from the current flow */
	clearUnreachableNodes(): void {
		this.cleanupNodes("unreachable");
	}

	/** Legacy wrapper - calls the unified cleanup */
	private clearFutureStateFrom(nodeToKeep: PromptNode): void {
		this.cleanupNodes("from-node", { node: nodeToKeep });
	}

	/** Remove conditional groups (placeholder for future enhancement) */
	removeInvalidConditionalGroups(fieldId: string, newValue: any): void {
		console.log(
			`Field ${fieldId} changed to ${newValue}, checking for conditional groups to remove...`
		);
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

	// Get the flow type of a group (for runtime queries)
	getGroupFlow(
		groupId: string
	): "progressive" | "phased" | "static" | undefined {
		return this.getNode(groupId)?.flow;
	}

	// Get the depth of a group (for runtime queries)
	getGroupDepth(groupId: string): number | undefined {
		return this.getNode(groupId)?.depth;
	}

	clearHistoryAfter(nodeId: string): void {
		const index = this.tree.history.findIndex((node) => node.id === nodeId);
		if (index >= 0) {
			this.tree.history = this.tree.history.slice(0, index + 1);
		}
	}

	// ========== Direct PromptRequest Handling ==========
	// These methods eliminate the need for PromptTreeAdapter

	/**
	 * Add a prompt request (field or group) to the tree
	 * @param request - The prompt request
	 * @param explicitParentId - Explicit parent group ID from runtime (preferred)
	 */
	addPromptRequest(
		request: PromptRequest,
		explicitParentId?: string | null
	): PromptNode {
		if (request.type === "group") {
			return this.addGroupRequest(request, explicitParentId);
		} else {
			return this.addFieldRequest(request, explicitParentId);
		}
	}

	/**
	 * Add a group to the tree
	 * @param request - Group request
	 * @param explicitParentId - Explicit parent from runtime (which knows groupStack)
	 */
	private addGroupRequest(
		request: PromptRequest,
		explicitParentId?: string | null
	): PromptNode {
		// Use explicit parent ID if provided (preferred path)
		let parentGroupId: string | undefined;

		if (explicitParentId && explicitParentId !== "root") {
			// Trust the explicit parent from runtime
			const parentExists = this.getNode(explicitParentId);
			if (parentExists) {
				parentGroupId = explicitParentId;
			} else {
				console.warn(
					`Explicit parent "${explicitParentId}" not found, falling back to depth inference`
				);
				parentGroupId = this.findParentGroupIdByDepth(
					request.depth || 0
				);
			}
		} else {
			// Fallback: infer from depth (legacy path for backward compatibility)
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

	/**
	 * Add a field to the tree
	 * @param request - Field request
	 * @param explicitParentId - Explicit parent from runtime (which knows groupStack)
	 */
	private addFieldRequest(
		request: PromptRequest,
		explicitParentId?: string | null
	): PromptNode {
		// Determine parent - prefer explicit parent from runtime, fallback to depth inference
		let parentId: string | undefined;
		if (explicitParentId && explicitParentId !== "root") {
			// Trust explicit parent from runtime (preferred path)
			const parentExists = this.getNode(explicitParentId);
			if (parentExists) {
				parentId = explicitParentId;
			} else {
				console.warn(
					`Explicit parent "${explicitParentId}" not found for field, using root`
				);
				parentId = "root";
			}
		} else {
			// Use root if no explicit parent provided
			parentId = "root";
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

	/**
	 * Find parent group by depth (LEGACY FALLBACK - prefer explicit parent)
	 *
	 * This method infers parent from depth, which is complex and error-prone.
	 * It's kept for backward compatibility when explicit parent is not provided.
	 *
	 * PREFERRED: Pass explicit parent ID from runtime (which knows groupStack).
	 * The runtime has groupStack and knows the exact parent context.
	 */
	private findParentGroupIdByDepth(requestDepth: number): string | undefined {
		if (requestDepth <= 0) return undefined;

		const parentDepth = requestDepth - 1;

		// Strategy 1: Search from active node upwards for group at parent depth
		const activeNode = this.getActiveNode();
		if (activeNode) {
			const groupFromActive = this.findGroupAtDepth(
				activeNode,
				parentDepth
			);
			if (groupFromActive) return groupFromActive.id;
		}

		// Strategy 2: Find all groups at parent depth
		const groups = this.getNodesByType("group");
		const potentialParents = groups.filter((g) => g.depth === parentDepth);

		if (potentialParents.length === 0) return "root";
		if (potentialParents.length === 1) return potentialParents[0].id;

		// Strategy 3: If multiple candidates, use most recent from history
		const history = this.getNavigationPath();
		for (let i = history.length - 1; i >= 0; i--) {
			const groupFromHistory = this.findGroupAtDepth(
				history[i],
				parentDepth
			);
			if (
				groupFromHistory &&
				potentialParents.includes(groupFromHistory)
			) {
				return groupFromHistory.id;
			}
		}

		// Fallback: use last potential parent
		return potentialParents[potentialParents.length - 1].id;
	}

	/** Helper: Find a group at a specific depth by traversing upwards from a node */
	private findGroupAtDepth(
		fromNode: PromptNode,
		targetDepth: number
	): PromptNode | null {
		let current: PromptNode | undefined = fromNode;
		while (current) {
			if (current.type === "group" && current.depth === targetDepth) {
				return current;
			}
			current = current.parent;
		}
		return null;
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
