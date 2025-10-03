import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { flushSync } from "react-dom";
// import { addToSet, setInMap, updateInMap } from "../../utils/immutable.js"; // Unused during tree migration
import { RecursiveGroupContainer } from "../group/RecursiveGroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { globalRegistry } from "../../registry.js";
// import { initializeTasksInApp } from "../../plugins/tasks/index.js"; // Unused during tree migration
// Removed StateRegistry import - plugins now get state directly from tree
import { PromptTreeManager, PromptNode } from "../../core/PromptTree.js";
import { PromptTreeAdapter } from "../../core/PromptTreeAdapter.js";
import { PluginWrapper } from "./PluginWrapper.js";
import { updateCompletedFieldsState } from "../../plugins/completed-fields/CompletedFieldsStore.js";
import { PromptRequest } from "../../types/index.js";

// Type declaration for debug utilities
declare global {
	interface Window {
		__promptTreeDebug?: any;
	}
	var __debugTree: (() => void) | undefined;
}

interface PromptAppProps {
	onReady: (promptFn: (request: PromptRequest) => Promise<any>) => void;
}

// Type definitions for grouped state
type FieldInfo = {
	id: string;
	label: string;
	type: string;
	hideAfterSubmit?: boolean;
};

// Tree-based state management

export function PromptApp({ onReady }: PromptAppProps) {
	const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(
		null
	);
	// ⬇️ resolver kept in a ref to avoid re-renders
	const resolverRef = useRef<((value: any) => void) | null>(null);

	// Tree-based state management
	const treeManagerRef = useRef<PromptTreeManager>(new PromptTreeManager());
	const treeAdapterRef = useRef<PromptTreeAdapter>(
		new PromptTreeAdapter(treeManagerRef.current)
	);
	const [treeRevision, setTreeRevision] = useState(0); // For forcing re-renders when tree changes

	// Memoized tree to ensure UI updates when tree structure changes
	const currentTree = useMemo(() => {
		return treeManagerRef.current.getTree();
	}, [treeRevision]);

	// Computed getters from tree state (tree is the source of truth)
	const syncedState = treeAdapterRef.current.syncTreeToOldState();
	const fieldValues = syncedState.fieldState.values;
	const visitedPrompts = syncedState.fieldState.visited;
	const completedFields = syncedState.fieldState.completed;
	const fieldProperties = syncedState.fieldState.properties;
	const fieldMessages = syncedState.fieldState.messages;
	const fieldGroupNames = syncedState.fieldState.groupNames;
	const fieldGroupIds = syncedState.fieldState.groupIds;

	const progressiveGroups = syncedState.groupState.progressive;
	const phaseGroups = syncedState.groupState.phased;
	const staticGroups = syncedState.groupState.static;
	const completedGroups = syncedState.groupState.completed;
	const groupOrder = syncedState.groupState.order;
	const arrowNavigationGroups = syncedState.groupState.arrowNavigation;
	const groupDepths = syncedState.groupState.depths;

	const rootPromptOrder = syncedState.promptOrderState.root;
	const rootFieldHistory = syncedState.promptOrderState.rootFieldHistory;
	const staticGroupFields = syncedState.promptOrderState.staticGroupFields;
	const groupFieldHistory = syncedState.promptOrderState.groupFieldHistory;

	// State synchronization with tree
	const setFieldValues = (
		updater: (prev: Record<string, any>) => Record<string, any>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1); // Force re-render to show tree changes
	};

	const setVisitedPrompts = (updater: (prev: Set<string>) => Set<string>) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setCompletedFields = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setFieldProperties = (
		updater: (prev: Map<string, any>) => Map<string, any>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setFieldMessages = (
		updater: (prev: Record<string, string>) => Record<string, string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setFieldGroupNames = (
		updater: (prev: Record<string, string>) => Record<string, string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setFieldGroupIds = (
		updater: (prev: Record<string, string>) => Record<string, string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setProgressiveGroups = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setPhaseGroups = (updater: (prev: Set<string>) => Set<string>) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setStaticGroups = (updater: (prev: Set<string>) => Set<string>) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setCompletedGroups = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setGroupOrder = (updater: (prev: string[]) => string[]) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setArrowNavigationGroups = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setGroupDepths = (
		updater: (prev: Map<string, number>) => Map<string, number>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setRootPromptOrder = (
		updater: (
			prev: Array<{
				id: string;
				type: "field" | "group";
				groupName?: string;
			}>
		) => Array<{ id: string; type: "field" | "group"; groupName?: string }>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setRootFieldHistory = (
		updater: (prev: Array<FieldInfo>) => Array<FieldInfo>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setStaticGroupFields = (
		updater: (
			prev: Map<string, Array<FieldInfo>>
		) => Map<string, Array<FieldInfo>>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	const setGroupFieldHistory = (
		updater: (
			prev: Map<string, Array<FieldInfo>>
		) => Map<string, Array<FieldInfo>>
	) => {
		// No-op: Tree manages state now
		setTreeRevision((prev) => prev + 1);
	};

	// Other non-grouped state
	const [currentGroup, setCurrentGroup] = useState<string | null>(null);
	const completionHistoryRef = useRef<string[]>([]);
	const groupIdToMessageRef = useRef<Map<string, string | undefined>>(
		new Map()
	);
	const isNavigatingBack = useRef(false);

	// State is now managed directly by the tree structure
	// Update CompletedFields plugin with current state
	useEffect(() => {
		updateCompletedFieldsState({
			fieldState: {
				values: fieldValues,
				visited: visitedPrompts,
				completed: completedFields,
				properties: fieldProperties,
				messages: fieldMessages,
				groupNames: fieldGroupNames,
				groupIds: fieldGroupIds,
			},
			promptOrderState: {
				rootFieldHistory,
				groupFieldHistory,
			},
		});
	}, [
		fieldValues,
		visitedPrompts,
		completedFields,
		fieldProperties,
		fieldMessages,
		fieldGroupNames,
		fieldGroupIds,
		rootFieldHistory,
		groupFieldHistory,
	]);

	const firstFieldIdRef = useRef<string | null>(null);
	const staticGroupsRef = useRef<Set<string>>(new Set());
	// Track hint text per prompt ID - prevents hint flicker during navigation
	const hintsByPromptId = useRef<Map<string, React.ReactNode>>(new Map());

	// Add revision counter for static group conditional field updates
	const [staticGroupRevision, setStaticGroupRevision] = useState(0);

	// Helper function to get display name for a group
	const getGroupDisplayName = (groupId: string | null): string | null => {
		if (!groupId) return null;
		return groupIdToMessageRef.current.get(groupId) || null;
	};

	// Handler for when fields provide hint text - stores per prompt ID
	const handleHintChange = useCallback(
		(hint: React.ReactNode) => {
			if (currentPrompt?.id) {
				hintsByPromptId.current.set(currentPrompt.id, hint);
				// Trigger re-render to show the updated hint
				setStaticGroupRevision((prev) => prev + 1);
			}
		},
		[currentPrompt?.id]
	);

	// Get hint for current prompt only
	const currentHintText = currentPrompt?.id
		? hintsByPromptId.current.get(currentPrompt.id) || null
		: null;

	useEffect(() => {
		const promptFn = (request: PromptRequest): Promise<any> => {
			return new Promise((resolve) => {
				// Handle flow completion first
				if (request.type === "completeFlow") {
					// Handle flow completion - mark all fields as completed
					setCompletedFields((prev) => {
						const newCompleted = new Set(prev);
						// Add all field values as completed
						Object.keys(fieldValues).forEach((fieldId) => {
							newCompleted.add(fieldId);
							completionHistoryRef.current.push(fieldId);
						});
						return newCompleted;
					});

					// Clear the current prompt so the active field transitions to completed state
					setCurrentPrompt(null);

					// Resolve immediately
					resolve(undefined);
					return;
				}

				if (
					request.type !== "group" &&
					firstFieldIdRef.current === null &&
					globalRegistry.isInteractive(request.type)
				) {
					firstFieldIdRef.current = request.id;
				}
				// Use flushSync to ensure both updates happen atomically in a single render
				flushSync(() => {
					// Update both currentPrompt and completedFields in a single batched state update
					const shouldCleanup =
						isNavigatingBack.current && request.type !== "group";

					if (shouldCleanup) {
						isNavigatingBack.current = false;

						// Update both states together for true atomicity
						setCurrentPrompt(request);
						setCompletedFields((prev) => {
							if (!prev.has(request.id)) {
								return prev;
							}
							const next = new Set(prev);
							next.delete(request.id);

							// Also remove from completion history
							const index = completionHistoryRef.current.indexOf(
								request.id
							);
							if (index > -1) {
								completionHistoryRef.current.splice(index, 1);
							}

							return next;
						});
					} else {
						setCurrentPrompt(request);
					}
				});

				// ⬇️ assign without rendering
				resolverRef.current = resolve;

				// NEW: Add prompt to tree structure and activate it
				try {
					// More robust parent group determination to avoid race conditions
					let currentGroup: string | null = null;

					if (request.type === "group") {
						// For group prompts, use the tree's current state to find the correct parent
						const activeNode =
							treeManagerRef.current.getActiveNode();
						if (activeNode) {
							if (activeNode.type === "group") {
								// Current active node is a group - use it as parent
								currentGroup = activeNode.id;
							} else {
								// Current active node is a field - find its parent group
								const parentGroup =
									treeManagerRef.current.findParentGroup(
										activeNode
									);
								currentGroup = parentGroup?.id || null;
							}
						}

						// Fallback: use the provided groupName from the request
						if (
							!currentGroup &&
							request.groupName &&
							request.groupName !== "root"
						) {
							const parentExists = treeManagerRef.current.getNode(
								request.groupName
							);
							if (parentExists) {
								currentGroup = request.groupName;
							}
						}
					} else {
						// For field prompts, prefer the explicitly provided groupName
						if (request.groupName && request.groupName !== "root") {
							const parentExists = treeManagerRef.current.getNode(
								request.groupName
							);
							if (parentExists) {
								currentGroup = request.groupName;
							} else {
								// If groupName doesn't exist, field should go to root
								currentGroup = null;
							}
						} else {
							// No groupName or explicitly "root" - field belongs at root level
							currentGroup = null;
						}
					}

					treeAdapterRef.current.addPromptRequestToTree(
						request,
						currentGroup
					);

					// Activate the prompt in the tree (crucial for rendering)
					if (request.type !== "group") {
						treeManagerRef.current.navigateTo(request.id);
					}

					// Force re-render to reflect tree changes
					setTreeRevision((prev) => prev + 1);

					// Log tree structure for debugging
					if (process.env.NODE_ENV === "development") {
						console.log(
							"🌳 Tree updated for prompt:",
							request.id,
							request.type
						);
						console.log(
							"📋 Parent group determined as:",
							currentGroup
						);
						console.log(
							"🎯 Active node:",
							treeManagerRef.current.getActiveNode()?.id
						);

						// Additional logging for group prompts
						if (request.type === "group") {
							const addedNode = treeManagerRef.current.getNode(
								request.id
							);
							if (addedNode) {
								console.log(
									"👨‍👩‍👧‍👦 Group parent:",
									addedNode.parent?.id
								);
								console.log("📊 Group depth:", addedNode.depth);
							}
						}
					}
				} catch (error) {
					console.warn(
						"Tree management error (non-critical during migration):",
						error
					);
				}

				// Store complete field properties for later rendering
				if (request.type !== "group") {
					setFieldProperties((prev) => {
						const newMap = new Map(prev);
						newMap.set(request.id, request);
						return newMap;
					});

					// Track field metadata for completed fields plugin
					// Try to get the field label from various possible properties
					const fieldLabel =
						request.label ||
						request.message ||
						`${request.type} field`;
					setFieldMessages((prev) => ({
						...prev,
						[request.id]: fieldLabel,
					}));
					if (request.groupName) {
						// Store the group ID (for filtering)
						setFieldGroupIds((prev) => ({
							...prev,
							[request.id]: request.groupName!,
						}));

						// Store the group display name (for UI display) - only if there's actually a label
						const groupDisplayName =
							groupIdToMessageRef.current.get(request.groupName);
						if (groupDisplayName) {
							setFieldGroupNames((prev) => ({
								...prev,
								[request.id]: groupDisplayName,
							}));
						}
					}
				}

				// Track root-level prompt order
				if (request.type !== "group") {
					setRootPromptOrder((prev) => {
						const entry = {
							id: request.id,
							type: "field" as const,
							groupName: request.groupName,
						};
						if (!prev.some((p) => p.id === request.id)) {
							return [...prev, entry];
						}
						return prev;
					});

					// For fields in static groups, track them immediately in the static fields store
					if (
						request.groupName &&
						staticGroupsRef.current.has(request.groupName)
					) {
						setStaticGroupFields((prev) => {
							const newMap = new Map(prev);
							const groupFields =
								newMap.get(request.groupName!) || [];
							const fieldInfo = {
								id: request.id,
								label: request.label || `${request.type} field`,
								type: request.type,
								hideAfterSubmit: request.hideAfterSubmit,
							};

							// Only add if not already present (check by label and type to avoid duplicates from discovery vs execution)
							if (
								!groupFields.some(
									(f) =>
										f.label === fieldInfo.label &&
										f.type === fieldInfo.type
								)
							) {
								newMap.set(request.groupName!, [
									...groupFields,
									fieldInfo,
								]);
							}
							return newMap;
						});
					}
				} else if (request.type === "group") {
					setRootPromptOrder((prev) => {
						const entry = {
							id: request.id,
							type: "group" as const,
							groupName: request.id, // Use ID as the stable identifier
						};
						if (!prev.some((p) => p.id === request.id)) {
							return [...prev, entry];
						}
						return prev;
					});

					// Track group ID to label mapping
					groupIdToMessageRef.current.set(request.id, request.label);

					// Track group order using IDs
					setGroupOrder((prev) => {
						if (!prev.includes(request.id)) {
							return [...prev, request.id];
						}
						return prev;
					});

					// Track group depth
					if (request.depth !== undefined) {
						setGroupDepths((prev) => {
							const newMap = new Map(prev);
							newMap.set(request.id, request.depth!);
							return newMap;
						});
					}
				}

				// Update currentGroup based on the request
				if (request.type !== "group") {
					// Field prompts always update the group (most accurate)
					setCurrentGroup(request.groupName || null);
				} else if (request.type === "group") {
					// Group prompts update the group (needed for initial display and cross-group nav)
					setCurrentGroup(request.id); // Use ID as the stable identifier

					// Track progressive groups (default behavior)
					if (request.flow === "progressive" || !request.flow) {
						setProgressiveGroups((prev) =>
							new Set(prev).add(request.id)
						);
					}

					// Track phased groups
					if (request.flow === "phased") {
						setPhaseGroups((prev) => new Set(prev).add(request.id));
					}

					// Track static groups (non-default behavior)
					if (request.flow === "static") {
						staticGroupsRef.current.add(request.id);
						setStaticGroups((prev) =>
							new Set(prev).add(request.id)
						);

						// Track arrow navigation for this group
						if (request.enableArrowNavigation) {
							setArrowNavigationGroups((prev) =>
								new Set(prev).add(request.id)
							);
						}

						// Pre-populate static group fields from discovery
						if (
							request.discoveredFields &&
							request.discoveredFields.length > 0
						) {
							setStaticGroupFields((prev) => {
								const newMap = new Map(prev);
								newMap.set(
									request.id,
									request.discoveredFields!
								);
								return newMap;
							});
						}
					}
				}
			});
		};

		onReady(promptFn);
	}, [onReady]);

	const handleSubmit = useCallback(
		(value: any) => {
			if (resolverRef.current && currentPrompt) {
				if (currentPrompt.type !== "group") {
					// Handle special navigation value that clears entire group and goes back
					if (
						typeof value === "object" &&
						value?.__clearGroupAndBack
					) {
						// Clear all fields in the current group
						if (currentPrompt.groupName) {
							// Find all fields that belong to this group and clear them
							setFieldValues((prev) => {
								const newFieldValues = { ...prev };

								// Remove all field values for fields in this group
								const groupName = currentPrompt.groupName;
								for (const [fieldId, _] of Object.entries(
									newFieldValues
								)) {
									// Check if this field belongs to the current group
									const fieldEntry = rootPromptOrder.find(
										(entry) =>
											entry.id === fieldId &&
											entry.groupName === groupName
									);
									if (fieldEntry) {
										delete newFieldValues[fieldId];
									}
								}

								return newFieldValues;
							});

							// Also clear completion tracking for group fields
							setCompletedFields((prev) => {
								const newCompleted = new Set(prev);
								const groupName = currentPrompt.groupName;

								// Remove completion status for all fields in this group
								for (const fieldId of newCompleted) {
									const fieldEntry = rootPromptOrder.find(
										(entry) =>
											entry.id === fieldId &&
											entry.groupName === groupName
									);
									if (fieldEntry) {
										newCompleted.delete(fieldId);
									}
								}

								return newCompleted;
							});

							// Clear visited prompts for group fields
							setVisitedPrompts((prev) => {
								const newVisited = new Set(prev);
								const groupName = currentPrompt.groupName;

								for (const fieldId of newVisited) {
									const fieldEntry = rootPromptOrder.find(
										(entry) =>
											entry.id === fieldId &&
											entry.groupName === groupName
									);
									if (fieldEntry) {
										newVisited.delete(fieldId);
									}
								}

								return newVisited;
							});
						}

						// Trigger back navigation
						performTreeBackNavigation(); // Ensure tree navigation happens here too
						const r = resolverRef.current;
						resolverRef.current = null;
						r({ __back: true });
						return;
					}

					// Handle special navigation value that preserves field content but goes back
					if (typeof value === "object" && value?.__preserveAndBack) {
						// Store the actual value, not the navigation object
						const actualValue = value.value;
						setFieldValues((prev) => ({
							...prev,
							[currentPrompt.id]: actualValue,
						}));

						// Mark as visited
						setVisitedPrompts((prev) =>
							new Set(prev).add(currentPrompt.id)
						);

						// Mark field as completed (if it meets completion criteria)
						const shouldMarkCompleted =
							currentPrompt.type !== "text" &&
							currentPrompt.type !== "custom-text" &&
							currentPrompt.type !== "validated-text"
								? actualValue !== undefined
								: typeof actualValue === "string"
								? actualValue.trim() !== ""
								: actualValue !== undefined;

						if (
							shouldMarkCompleted &&
							!currentPrompt.excludeFromCompleted
						) {
							setCompletedFields((prev) =>
								new Set(prev).add(currentPrompt.id)
							);
							completionHistoryRef.current.push(currentPrompt.id);
						}

						// Handle group tracking for static groups
						if (currentPrompt.groupName) {
							const isStaticGroup = staticGroups.has(
								currentPrompt.groupName
							);

							if (isStaticGroup) {
								// Add current field to static group fields
								setStaticGroupFields((prev) => {
									const newMap = new Map(prev);
									const groupFields =
										newMap.get(currentPrompt.groupName!) ||
										[];
									const fieldInfo = {
										id: currentPrompt.id,
										label:
											currentPrompt.label ||
											`${currentPrompt.type} field`,
										type: currentPrompt.type,
										hideAfterSubmit:
											currentPrompt.hideAfterSubmit,
									};

									// Only add if not already present
									if (
										!groupFields.some(
											(f) =>
												f.label === fieldInfo.label &&
												f.type === fieldInfo.type
										)
									) {
										newMap.set(currentPrompt.groupName!, [
											...groupFields,
											fieldInfo,
										]);
									}
									return newMap;
								});

								// Trigger conditional field re-evaluation with revision counter
								setStaticGroupRevision((prev) => prev + 1);
							}

							// Track in group history for non-phase groups
							const isPhaseGroup = phaseGroups.has(
								currentPrompt.groupName
							);
							if (!isPhaseGroup) {
								setGroupFieldHistory((prev) => {
									const newMap = new Map(prev);
									const groupFields =
										newMap.get(currentPrompt.groupName!) ||
										[];
									const fieldInfo = {
										id: currentPrompt.id,
										label:
											currentPrompt.label ||
											`${currentPrompt.type} field`,
										type: currentPrompt.type,
										hideAfterSubmit:
											currentPrompt.hideAfterSubmit,
									};

									if (
										!groupFields.some(
											(f) => f.id === currentPrompt.id
										)
									) {
										newMap.set(currentPrompt.groupName!, [
											...groupFields,
											fieldInfo,
										]);
									}
									return newMap;
								});
							}
						} else {
							// For root-level fields, track in root history
							setRootFieldHistory((prev) => {
								const fieldInfo = {
									id: currentPrompt.id,
									label:
										currentPrompt.label ||
										`${currentPrompt.type} field`,
									type: currentPrompt.type,
									hideAfterSubmit:
										currentPrompt.hideAfterSubmit,
								};

								if (
									!prev.some((f) => f.id === currentPrompt.id)
								) {
									return [...prev, fieldInfo];
								}
								return prev;
							});
						}

						// Trigger back navigation
						performTreeBackNavigation(); // Ensure tree navigation happens here too
						const r = resolverRef.current;
						resolverRef.current = null;
						r({ __back: true });
						return;
					}

					// Regular submit - store the value
					setFieldValues((prev) => ({
						...prev,
						[currentPrompt.id]: value,
					}));
					setVisitedPrompts((prev) =>
						new Set(prev).add(currentPrompt.id)
					);

					// NEW: Update tree with submitted value
					try {
						treeManagerRef.current.updateNode(currentPrompt.id, {
							value: value,
							visited: true,
							completed: !currentPrompt.excludeFromCompleted,
						});
						setTreeRevision((prev) => prev + 1);

						// Force state cleanup after tree changes (in case conditional groups were removed)
						setTimeout(() => {
							const allNodes = treeManagerRef.current.findNodes(
								() => true
							);
							const currentNodeIds = new Set(
								allNodes.map((node) => node.id)
							);

							// Clean up state for any nodes that no longer exist
							[
								fieldValues,
								fieldProperties,
								fieldMessages,
								fieldGroupNames,
								fieldGroupIds,
							].forEach((stateObj) => {
								if (stateObj instanceof Map) {
									stateObj.forEach((_, key) => {
										if (!currentNodeIds.has(key)) {
											stateObj.delete(key);
										}
									});
								} else {
									Object.keys(stateObj).forEach((key) => {
										if (!currentNodeIds.has(key)) {
											delete stateObj[key];
										}
									});
								}
							});

							// Trigger another re-render to ensure UI reflects the cleanup
							setTreeRevision((prev) => prev + 1);
						}, 0);
					} catch (error) {
						console.warn(
							"Tree update error (non-critical during migration):",
							error
						);
					}

					// Clear back navigation flag since we're going forward
					isNavigatingBack.current = false;

					// Mark field as completed and track history
					if (!currentPrompt.excludeFromCompleted) {
						setCompletedFields((prev) =>
							new Set(prev).add(currentPrompt.id)
						);
						// Only add to history if not already present anywhere (avoid duplicates)
						const alreadyInHistory =
							completionHistoryRef.current.includes(
								currentPrompt.id
							);
						if (!alreadyInHistory) {
							completionHistoryRef.current.push(currentPrompt.id);
						}
					}

					if (currentPrompt.groupName) {
						// For grouped fields, track in group history
						// Phase groups don't track history, static groups track all fields
						const isPhaseGroup = phaseGroups.has(
							currentPrompt.groupName
						);
						const isStaticGroup = staticGroups.has(
							currentPrompt.groupName
						);

						// For static groups, trigger field revelation when conditions are met
						if (isStaticGroup) {
							// First add the current field
							setStaticGroupFields((prev) => {
								const newMap = new Map(prev);
								const groupFields =
									newMap.get(currentPrompt.groupName!) || [];
								const fieldInfo = {
									id: currentPrompt.id,
									label:
										currentPrompt.label ||
										`${currentPrompt.type} field`,
									type: currentPrompt.type,
									hideAfterSubmit:
										currentPrompt.hideAfterSubmit,
								};

								// Only add if not already present (check by label and type)
								if (
									!groupFields.some(
										(f) =>
											f.label === fieldInfo.label &&
											f.type === fieldInfo.type
									)
								) {
									newMap.set(currentPrompt.groupName!, [
										...groupFields,
										fieldInfo,
									]);
								}
								return newMap;
							});

							// Trigger conditional field re-evaluation with revision counter
							// This allows any field to potentially trigger conditional field visibility
							setStaticGroupRevision((prev) => prev + 1);
						}

						if (!isPhaseGroup) {
							setGroupFieldHistory((prev) => {
								const newMap = new Map(prev);
								const groupFields =
									newMap.get(currentPrompt.groupName!) || [];
								const fieldInfo = {
									id: currentPrompt.id,
									label:
										currentPrompt.label ||
										`${currentPrompt.type} field`,
									type: currentPrompt.type,
									hideAfterSubmit:
										currentPrompt.hideAfterSubmit,
								};

								// Extra validation: ensure this field ID doesn't already exist in any other group
								// This prevents cross-contamination between groups with similar conditional logic
								let fieldExistsInOtherGroup = false;
								for (const [
									existingGroupName,
									existingFields,
								] of newMap.entries()) {
									if (
										existingGroupName !==
											currentPrompt.groupName &&
										existingFields.some(
											(f) => f.id === currentPrompt.id
										)
									) {
										fieldExistsInOtherGroup = true;
										break;
									}
								}

								if (
									!groupFields.some(
										(f) => f.id === currentPrompt.id
									) &&
									!fieldExistsInOtherGroup
								) {
									newMap.set(currentPrompt.groupName!, [
										...groupFields,
										fieldInfo,
									]);
								}
								return newMap;
							});
						}
					} else {
						// For root-level fields, track in root history
						setRootFieldHistory((prev) => {
							const fieldInfo = {
								id: currentPrompt.id,
								label:
									currentPrompt.label ||
									`${currentPrompt.type} field`,
								type: currentPrompt.type,
								hideAfterSubmit: currentPrompt.hideAfterSubmit,
							};

							// Extra validation: ensure this field doesn't get added multiple times
							// and doesn't conflict with any group fields
							if (!prev.some((f) => f.id === currentPrompt.id)) {
								return [...prev, fieldInfo];
							}
							return prev;
						});
					}
				}
				const r = resolverRef.current;
				resolverRef.current = null;

				r(value);
			}
		},
		[currentPrompt, rootPromptOrder, phaseGroups, staticGroups]
	);

	// Extract tree navigation and synchronization logic to be used by all back navigation paths
	const performTreeBackNavigation = useCallback(() => {
		try {
			const canGoBack = treeManagerRef.current.canGoBack();
			if (canGoBack) {
				const result = treeManagerRef.current.goBack();
				if (result.success) {
					// Synchronize state with tree
					// Clear completed status for all nodes that were reset by goBack()
					const allNodes = treeManagerRef.current.findNodes(
						() => true
					);
					const currentNodeIds = new Set(
						allNodes.map((node) => node.id)
					);

					// Find all nodes that are no longer completed and remove them from completed state
					const noLongerCompleted: string[] = [];
					allNodes.forEach((node: PromptNode) => {
						if (!node.completed && completedFields.has(node.id)) {
							noLongerCompleted.push(node.id);
						}
					});

					// Clear from completed fields
					if (noLongerCompleted.length > 0) {
						setCompletedFields((prev) => {
							const newCompleted = new Set(prev);
							noLongerCompleted.forEach((id) =>
								newCompleted.delete(id)
							);
							return newCompleted;
						});
					}

					// Clean up state for nodes that no longer exist in the tree
					// This is crucial for conditional groups that should disappear when conditions change

					// Clean up field values for removed nodes
					setFieldValues((prev) => {
						const newValues = { ...prev };
						Object.keys(newValues).forEach((fieldId) => {
							if (!currentNodeIds.has(fieldId)) {
								delete newValues[fieldId];
							}
						});
						return newValues;
					});

					// Clean up visited prompts for removed nodes
					setVisitedPrompts((prev) => {
						const newVisited = new Set(prev);
						prev.forEach((fieldId) => {
							if (!currentNodeIds.has(fieldId)) {
								newVisited.delete(fieldId);
							}
						});
						return newVisited;
					});

					// Clean up field properties for removed nodes
					setFieldProperties((prev) => {
						const newProperties = new Map(prev);
						prev.forEach((_, fieldId) => {
							if (!currentNodeIds.has(fieldId)) {
								newProperties.delete(fieldId);
							}
						});
						return newProperties;
					});

					// Clean up field messages for removed nodes
					setFieldMessages((prev) => {
						const newMessages = { ...prev };
						Object.keys(newMessages).forEach((fieldId) => {
							if (!currentNodeIds.has(fieldId)) {
								delete newMessages[fieldId];
							}
						});
						return newMessages;
					});

					// Clean up field group names for removed nodes
					setFieldGroupNames((prev) => {
						const newGroupNames = { ...prev };
						Object.keys(newGroupNames).forEach((fieldId) => {
							if (!currentNodeIds.has(fieldId)) {
								delete newGroupNames[fieldId];
							}
						});
						return newGroupNames;
					});

					// Clean up field group IDs for removed nodes
					setFieldGroupIds((prev) => {
						const newGroupIds = { ...prev };
						Object.keys(newGroupIds).forEach((fieldId) => {
							if (!currentNodeIds.has(fieldId)) {
								delete newGroupIds[fieldId];
							}
						});
						return newGroupIds;
					});

					// Clean up static group fields for removed groups and fields
					setStaticGroupFields((prev) => {
						const newStaticGroupFields = new Map(prev);
						// Remove entire group entries for groups that no longer exist
						prev.forEach((fields, groupId) => {
							if (!currentNodeIds.has(groupId)) {
								newStaticGroupFields.delete(groupId);
							} else {
								// For groups that still exist, remove fields that no longer exist
								const validFields = fields.filter((field) =>
									currentNodeIds.has(field.id)
								);
								if (validFields.length !== fields.length) {
									newStaticGroupFields.set(
										groupId,
										validFields
									);
								}
							}
						});
						return newStaticGroupFields;
					});

					// Clean up group field history for removed groups and fields
					setGroupFieldHistory((prev) => {
						const newGroupFieldHistory = new Map(prev);
						// Remove entire group entries for groups that no longer exist
						prev.forEach((fields, groupId) => {
							if (!currentNodeIds.has(groupId)) {
								newGroupFieldHistory.delete(groupId);
							} else {
								// For groups that still exist, remove fields that no longer exist
								const validFields = fields.filter((field) =>
									currentNodeIds.has(field.id)
								);
								if (validFields.length !== fields.length) {
									newGroupFieldHistory.set(
										groupId,
										validFields
									);
								}
							}
						});
						return newGroupFieldHistory;
					});

					// Clean up root field history for removed fields
					setRootFieldHistory((prev) => {
						return prev.filter((field) =>
							currentNodeIds.has(field.id)
						);
					});

					// Clean up root prompt order for removed items
					setRootPromptOrder((prev) => {
						return prev.filter((item) =>
							currentNodeIds.has(item.id)
						);
					});

					setTreeRevision((prev) => prev + 1);
				}
			}
		} catch (error) {
			console.warn(
				"Tree navigation error (non-critical during migration):",
				error
			);
		}
	}, [completedFields]);

	const handleBack = useCallback(() => {
		if (resolverRef.current && currentPrompt) {
			// Perform tree navigation and synchronization
			performTreeBackNavigation();

			// Set flag to indicate we're navigating back
			isNavigatingBack.current = true;

			const r = resolverRef.current;
			resolverRef.current = null;

			// Resolve - cleanup happens when next interactive prompt arrives
			// Note: Don't clear hint here - let the new prompt's hint replace the old one
			r({ __back: true });
		}
	}, [currentPrompt, performTreeBackNavigation]);

	// Track previous group to detect group completion
	const previousGroupRef = useRef<string | null>(null);

	// Detect group completion when transitioning between groups
	useEffect(() => {
		const prevGroup = previousGroupRef.current;

		// Only mark a group as completed when moving to a LATER group in the sequence
		// This prevents marking groups as completed when navigating backwards
		if (prevGroup && currentGroup && prevGroup !== currentGroup) {
			const prevGroupIndex = groupOrder.indexOf(prevGroup);
			let currentGroupIndex = groupOrder.indexOf(currentGroup);

			// If current group is not in groupOrder yet, calculate what its index would be
			let effectiveCurrentGroupIndex = currentGroupIndex;
			if (currentGroupIndex === -1) {
				// Calculate what the index would be after adding
				effectiveCurrentGroupIndex = groupOrder.length;

				// Add it to the order asynchronously
				setGroupOrder((prev) => {
					if (!prev.includes(currentGroup)) {
						return [...prev, currentGroup];
					}
					return prev;
				});
			}

			// Only mark as completed if we're moving forward in the sequence
			if (
				prevGroupIndex >= 0 &&
				effectiveCurrentGroupIndex >= 0 &&
				effectiveCurrentGroupIndex > prevGroupIndex
			) {
				setCompletedGroups((prev) => new Set(prev).add(prevGroup));
			}
		}

		// Also handle the case where we complete a group and move to a non-group prompt
		// This catches cases where the last group isn't followed by another group
		if (prevGroup && !currentGroup) {
			// When moving from a group to no group (root-level), mark the group as completed
			// Use a simpler check to avoid dependency issues
			setCompletedGroups((prev) => new Set(prev).add(prevGroup));
		}

		previousGroupRef.current = currentGroup;
	}, [currentGroup, phaseGroups, groupOrder]);

	// ⬇️ Auto-resolve group prompts without touching resolver state
	useEffect(() => {
		if (currentPrompt?.type === "group" && resolverRef.current) {
			const r = resolverRef.current;
			resolverRef.current = null;
			r(undefined);
			// NOTE: don't null out currentPrompt here; let the next prompt replace it.
		}
	}, [currentPrompt]);

	// NEW: Effect to log tree changes in development

	// Note: Hints are now stored per prompt ID, so they don't leak between prompts
	// Non-interactive prompts simply won't set a hint, so currentHintText will be null for them

	// Completely ignore group prompts in render
	const effectivePrompt =
		currentPrompt?.type === "group" ? null : currentPrompt;

	// LEGACY: Render completed fields - REMOVED
	const renderCompletedFields = null;

	// LEGACY: Render completed items in order - REMOVED
	const renderCompletedItemsInOrder = null;

	// Primary rendering: Tree-based recursive rendering

	return (
		<RootContainer>
			<RecursiveGroupContainer
				item={currentTree.root}
				treeManager={treeManagerRef.current}
				onSubmit={handleSubmit}
				onBack={handleBack}
				onHintChange={handleHintChange}
				hintText={currentHintText}
			/>
		</RootContainer>
	);
}
