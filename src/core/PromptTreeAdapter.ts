// Adapter functions to bridge between old state management and new tree structure
// This enables gradual migration without breaking existing functionality

import { PromptNode, PromptTreeManager } from "./PromptTree.js";
import {
	PromptRequest,
	FieldState,
	GroupState,
	PromptOrderState,
} from "../types/index.js";

export class PromptTreeAdapter {
	private treeManager: PromptTreeManager;
	private groupIdToPromptId: Map<string, string> = new Map();

	constructor(treeManager: PromptTreeManager) {
		this.treeManager = treeManager;
	}

	// Convert PromptRequest to PromptNode and add to tree
	addPromptRequestToTree(
		request: PromptRequest,
		currentGroup?: string | null
	): PromptNode {
		if (request.type === "group") {
			return this.addGroupToTree(request, currentGroup);
		} else {
			return this.addFieldToTree(request, currentGroup);
		}
	}

	private addGroupToTree(
		request: PromptRequest,
		currentGroup?: string | null
	): PromptNode {
		// More robust parent determination - prefer explicit currentGroup over heuristics
		let parentGroupId: string | undefined;

		if (currentGroup && currentGroup !== "root") {
			// Verify the currentGroup actually exists in the tree
			const parentExists = this.treeManager.getNode(currentGroup);
			if (parentExists) {
				parentGroupId = currentGroup;
			} else {
				console.warn(
					`PromptTreeAdapter: Specified parent group '${currentGroup}' not found, falling back to findParentGroupId`
				);
				parentGroupId = this.findParentGroupId(request);
			}
		} else {
			// Fall back to finding parent by depth
			parentGroupId = this.findParentGroupId(request);
		}

		const groupNode = this.treeManager.addNode(
			{
				id: request.id,
				type: "group",
				label: request.label,
				completed: false,
				visited: false,
				active: false,
				depth: request.depth || 0,
				flow: request.flow || "progressive",
				enableArrowNavigation: request.enableArrowNavigation,
				discoveredFields: request.discoveredFields,
				allowBack: request.allowBack,
				properties: { ...request },
			},
			parentGroupId
		);

		// Store the mapping for this group to help with future nested groups
		this.groupIdToPromptId.set(request.id, request.id);

		return groupNode;
	}

	private addFieldToTree(
		request: PromptRequest,
		currentGroup?: string | null
	): PromptNode {
		// More robust parent determination for fields
		let parentId: string = "root";

		if (currentGroup && currentGroup !== "root") {
			// Verify the currentGroup actually exists in the tree
			const parentExists = this.treeManager.getNode(currentGroup);
			if (parentExists) {
				parentId = currentGroup;
			} else {
				console.warn(
					`PromptTreeAdapter: Specified parent group '${currentGroup}' not found for field '${request.id}', using root`
				);
				parentId = "root";
			}
		}

		// Calculate depth based on actual parent
		const parentNode = this.treeManager.getNode(parentId);
		const calculatedDepth = parentNode ? parentNode.depth + 1 : 1;

		const fieldNode = this.treeManager.addNode(
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

	private findParentGroupId(request: PromptRequest): string | undefined {
		// Enhanced parent finding logic with better reliability
		if (request.depth && request.depth > 0) {
			const parentDepth = request.depth - 1;

			// First, try to find parent based on current navigation context
			const activeNode = this.treeManager.getActiveNode();
			if (activeNode) {
				// Look up the tree from active node to find a group at the right depth
				let current: PromptNode | undefined = activeNode;
				while (current) {
					if (
						current.type === "group" &&
						current.depth === parentDepth
					) {
						return current.id;
					}
					// Also check parent groups
					const parentGroup =
						this.treeManager.findParentGroup(current);
					if (parentGroup && parentGroup.depth === parentDepth) {
						return parentGroup.id;
					}
					current = current.parent;
				}
			}

			// Fall back to finding groups with the right depth
			const groups = this.treeManager.getNodesByType("group");
			const potentialParents = groups.filter(
				(g) => g.depth === parentDepth
			);

			if (potentialParents.length === 1) {
				// Only one potential parent - safe choice
				return potentialParents[0].id;
			} else if (potentialParents.length > 1) {
				// Multiple potential parents - use navigation history to decide
				const history = this.treeManager.getNavigationPath();

				// Find the most recent group in history at the correct depth
				for (let i = history.length - 1; i >= 0; i--) {
					const historyNode = history[i];
					if (
						historyNode.type === "group" &&
						historyNode.depth === parentDepth
					) {
						return historyNode.id;
					}
					// Also check parent groups of history nodes
					const parentGroup =
						this.treeManager.findParentGroup(historyNode);
					if (parentGroup && parentGroup.depth === parentDepth) {
						return parentGroup.id;
					}
				}

				// If still no match, return the most recently created (last resort)
				return potentialParents[potentialParents.length - 1].id;
			}
		}

		return "root";
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
			groupIds: {},
		};

		const groupState: GroupState = {
			progressive: new Set(),
			phased: new Set(),
			static: new Set(),
			completed: new Set(),
			order: [],
			arrowNavigation: new Set(),
			depths: new Map(),
		};

		const promptOrderState: PromptOrderState = {
			root: [],
			rootFieldHistory: [],
			staticGroupFields: new Map(),
			groupFieldHistory: new Map(),
		};

		// Traverse tree and populate old state
		this.treeManager.traverseDepthFirst((node) => {
			if (node.id === "root") return;

			if (node.type === "field") {
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
				fieldState.messages[node.id] =
					node.label || `${node.fieldType} field`;

				if (node.groupName) {
					fieldState.groupIds[node.id] = node.groupName;
					// Try to get group display name
					const groupNode = this.treeManager.getNode(node.groupName);
					if (groupNode?.label) {
						fieldState.groupNames[node.id] = groupNode.label;
					}
				}

				// Add to prompt order
				if (node.parent?.id === "root") {
					promptOrderState.root.push({
						id: node.id,
						type: "field",
						groupName: node.groupName,
					});
				}

				// Add to field history
				const fieldInfo = {
					id: node.id,
					label: node.label || `${node.fieldType} field`,
					type: node.fieldType || "unknown",
					hideAfterSubmit: node.hideAfterSubmit,
				};

				if (
					node.parent?.type === "group" &&
					node.parent.id !== "root"
				) {
					// Add to group field history
					const groupId = node.parent.id;
					const existing =
						promptOrderState.groupFieldHistory.get(groupId) || [];
					if (!existing.some((f) => f.id === node.id)) {
						promptOrderState.groupFieldHistory.set(groupId, [
							...existing,
							fieldInfo,
						]);
					}

					// Add to static group fields if applicable
					if (node.parent.flow === "static") {
						const staticFields =
							promptOrderState.staticGroupFields.get(groupId) ||
							[];
						if (!staticFields.some((f) => f.id === node.id)) {
							promptOrderState.staticGroupFields.set(groupId, [
								...staticFields,
								fieldInfo,
							]);
						}
					}
				} else {
					// Add to root field history
					if (
						!promptOrderState.rootFieldHistory.some(
							(f) => f.id === node.id
						)
					) {
						promptOrderState.rootFieldHistory.push(fieldInfo);
					}
				}
			} else if (node.type === "group") {
				// Populate group state
				if (node.flow === "progressive") {
					groupState.progressive.add(node.id);
				} else if (node.flow === "phased") {
					groupState.phased.add(node.id);
				} else if (node.flow === "static") {
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
				if (node.parent?.id === "root") {
					promptOrderState.root.push({
						id: node.id,
						type: "group",
						groupName: node.id,
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
		fieldState.visited.forEach((fieldId) => {
			this.treeManager.updateNode(fieldId, { visited: true });
		});

		// Update completed status
		fieldState.completed.forEach((fieldId) => {
			this.treeManager.updateNode(fieldId, { completed: true });
		});

		// Update group completed status
		groupState.completed.forEach((groupId) => {
			this.treeManager.updateNode(groupId, { completed: true });
		});

		// Update active node
		if (activePromptId) {
			// Deactivate all nodes first
			this.treeManager.traverseDepthFirst((node) => {
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
			type: node.type === "group" ? "group" : node.fieldType || "unknown",
			label: node.label,
			groupName: node.groupName,
			flow: node.flow,
			discoveredFields: node.discoveredFields,
			enableArrowNavigation: node.enableArrowNavigation,
			excludeFromCompleted: node.excludeFromCompleted,
			hideAfterSubmit: node.hideAfterSubmit,
			allowBack: node.allowBack,
			depth: node.depth,
		};

		return request;
	}

	// Get current group from tree state
	getCurrentGroup(): string | null {
		const activeNode = this.treeManager.getActiveNode();
		if (!activeNode) return null;

		if (activeNode.type === "group") {
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
