import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { flushSync } from "react-dom";
import { RecursiveGroupContainer } from "../group/RecursiveGroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { globalRegistry } from "../../registry.js";
import { PromptTreeManager, PromptNode } from "../../core/PromptTree.js";
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
	const [treeRevision, setTreeRevision] = useState(0); // For forcing re-renders when tree changes

	// Memoized tree to ensure UI updates when tree structure changes
	const currentTree = useMemo(() => {
		return treeManagerRef.current.getTree();
	}, [treeRevision]);

	// Get synced state from tree (tree is the single source of truth)
	const getSyncedState = useCallback(() => {
		return treeManagerRef.current.syncToLegacyState();
	}, [treeRevision]); // Re-compute when tree changes

	// Access state through memoized getter
	const syncedState = useMemo(() => getSyncedState(), [getSyncedState]);

	// Helper function to trigger re-render when tree state changes
	// Note: Tree manages state directly; these setters only trigger UI updates
	const updateTreeState = () => setTreeRevision((prev) => prev + 1);

	// Simplified setters that only trigger tree re-render (tree manages actual state)
	const setFieldValues = (
		_: (prev: Record<string, any>) => Record<string, any>
	) => updateTreeState();
	const setVisitedPrompts = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setCompletedFields = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setFieldProperties = (
		_: (prev: Map<string, any>) => Map<string, any>
	) => updateTreeState();
	const setFieldMessages = (
		_: (prev: Record<string, string>) => Record<string, string>
	) => updateTreeState();
	const setFieldGroupNames = (
		_: (prev: Record<string, string>) => Record<string, string>
	) => updateTreeState();
	const setFieldGroupIds = (
		_: (prev: Record<string, string>) => Record<string, string>
	) => updateTreeState();
	const setProgressiveGroups = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setPhaseGroups = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setStaticGroups = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setCompletedGroups = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setGroupOrder = (_: (prev: string[]) => string[]) =>
		updateTreeState();
	const setArrowNavigationGroups = (_: (prev: Set<string>) => Set<string>) =>
		updateTreeState();
	const setGroupDepths = (
		_: (prev: Map<string, number>) => Map<string, number>
	) => updateTreeState();
	const setRootPromptOrder = (
		_: (
			prev: Array<{
				id: string;
				type: "field" | "group";
				groupName?: string;
			}>
		) => Array<{ id: string; type: "field" | "group"; groupName?: string }>
	) => updateTreeState();
	const setRootFieldHistory = (
		_: (prev: Array<FieldInfo>) => Array<FieldInfo>
	) => updateTreeState();
	const setStaticGroupFields = (
		_: (
			prev: Map<string, Array<FieldInfo>>
		) => Map<string, Array<FieldInfo>>
	) => updateTreeState();
	const setGroupFieldHistory = (
		_: (
			prev: Map<string, Array<FieldInfo>>
		) => Map<string, Array<FieldInfo>>
	) => updateTreeState();

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
		const state = getSyncedState();
		updateCompletedFieldsState({
			fieldState: state.fieldState,
			promptOrderState: {
				rootFieldHistory: state.promptOrderState.rootFieldHistory,
				groupFieldHistory: state.promptOrderState.groupFieldHistory,
			},
		});
	}, [getSyncedState]);

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
					const state = getSyncedState();
					setCompletedFields((prev) => {
						const newCompleted = new Set(prev);
						// Add all field values as completed
						Object.keys(state.fieldState.values).forEach(
							(fieldId) => {
								newCompleted.add(fieldId);
								completionHistoryRef.current.push(fieldId);
							}
						);
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

					treeManagerRef.current.addPromptRequest(
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

	// Extract tree navigation and synchronization logic to be used by all back navigation paths
	const performTreeBackNavigation = useCallback(() => {
		try {
			const canGoBack = treeManagerRef.current.canGoBack();
			if (canGoBack) {
				const result = treeManagerRef.current.goBack();
				if (result.success) {
					// SIMPLIFIED FIX: The tree is the single source of truth
					// All state is managed by the tree structure itself
					// We just need to trigger a re-render to sync the UI with the tree state
					// The syncToLegacyState() method will handle all the state syncing
					setTreeRevision((prev) => prev + 1);
				}
			}
		} catch (error) {
			console.warn(
				"Tree navigation error (non-critical during migration):",
				error
			);
		}
	}, []);

	// Helper: Create field info object
	const createFieldInfo = useCallback(
		(prompt: PromptRequest) => ({
			id: prompt.id,
			label: prompt.label || `${prompt.type} field`,
			type: prompt.type,
			hideAfterSubmit: prompt.hideAfterSubmit,
		}),
		[]
	);

	// Helper: Add field to appropriate history tracking
	const addFieldToHistory = useCallback(
		(prompt: PromptRequest, fieldInfo: FieldInfo) => {
			if (prompt.groupName) {
				const state = getSyncedState();
				const isPhaseGroup = state.groupState.phased.has(
					prompt.groupName
				);
				const isStaticGroup = state.groupState.static.has(
					prompt.groupName
				);

				// Add to static group fields
				if (isStaticGroup) {
					setStaticGroupFields((prev) => {
						const newMap = new Map(prev);
						const groupFields = newMap.get(prompt.groupName!) || [];

						if (
							!groupFields.some(
								(f) =>
									f.label === fieldInfo.label &&
									f.type === fieldInfo.type
							)
						) {
							newMap.set(prompt.groupName!, [
								...groupFields,
								fieldInfo,
							]);
						}
						return newMap;
					});
					setStaticGroupRevision((prev) => prev + 1);
				}

				// Add to group history (non-phase groups)
				if (!isPhaseGroup) {
					setGroupFieldHistory((prev) => {
						const newMap = new Map(prev);
						const groupFields = newMap.get(prompt.groupName!) || [];

						// Prevent cross-contamination between groups
						const fieldExistsInOtherGroup = Array.from(
							newMap.entries()
						).some(
							([existingGroupName, existingFields]) =>
								existingGroupName !== prompt.groupName &&
								existingFields.some((f) => f.id === prompt.id)
						);

						if (
							!groupFields.some((f) => f.id === prompt.id) &&
							!fieldExistsInOtherGroup
						) {
							newMap.set(prompt.groupName!, [
								...groupFields,
								fieldInfo,
							]);
						}
						return newMap;
					});
				}
			} else {
				// Add to root history
				setRootFieldHistory((prev) => {
					if (!prev.some((f) => f.id === prompt.id)) {
						return [...prev, fieldInfo];
					}
					return prev;
				});
			}
		},
		[
			getSyncedState,
			setStaticGroupFields,
			setStaticGroupRevision,
			setGroupFieldHistory,
			setRootFieldHistory,
		]
	);

	// Helper: Mark field as completed
	const markFieldAsCompleted = useCallback(
		(prompt: PromptRequest, value: any) => {
			const shouldMarkCompleted =
				prompt.type !== "text" &&
				prompt.type !== "custom-text" &&
				prompt.type !== "validated-text"
					? value !== undefined
					: typeof value === "string"
					? value.trim() !== ""
					: value !== undefined;

			if (shouldMarkCompleted && !prompt.excludeFromCompleted) {
				setCompletedFields((prev) => new Set(prev).add(prompt.id));
				if (!completionHistoryRef.current.includes(prompt.id)) {
					completionHistoryRef.current.push(prompt.id);
				}
			}
		},
		[setCompletedFields, completionHistoryRef]
	);

	// Handler: Clear group and go back
	const handleClearGroupAndBack = useCallback(() => {
		if (!currentPrompt?.groupName) return;

		const state = getSyncedState();
		const groupName = currentPrompt.groupName;
		const clearGroupFields = (entries: any) =>
			state.promptOrderState.root.filter(
				(entry: any) =>
					entry.id === entries && entry.groupName === groupName
			);

		// Clear all group field states
		setFieldValues((prev) => {
			const newValues = { ...prev };
			Object.keys(newValues).forEach((fieldId) => {
				if (clearGroupFields(fieldId).length > 0) {
					delete newValues[fieldId];
				}
			});
			return newValues;
		});

		setCompletedFields((prev) => {
			const newCompleted = new Set(prev);
			clearGroupFields([...newCompleted]).forEach((entry: any) =>
				newCompleted.delete(entry.id)
			);
			return newCompleted;
		});

		setVisitedPrompts((prev) => {
			const newVisited = new Set(prev);
			clearGroupFields([...newVisited]).forEach((entry: any) =>
				newVisited.delete(entry.id)
			);
			return newVisited;
		});

		performTreeBackNavigation();
		const r = resolverRef.current;
		resolverRef.current = null;
		r?.({ __back: true });
	}, [
		currentPrompt,
		getSyncedState,
		setFieldValues,
		setCompletedFields,
		setVisitedPrompts,
		performTreeBackNavigation,
	]);

	// Handler: Preserve value and go back
	const handlePreserveAndBack = useCallback(
		(actualValue: any) => {
			if (!currentPrompt) return;

			setFieldValues((prev) => ({
				...prev,
				[currentPrompt.id]: actualValue,
			}));
			setVisitedPrompts((prev) => new Set(prev).add(currentPrompt.id));

			markFieldAsCompleted(currentPrompt, actualValue);
			addFieldToHistory(currentPrompt, createFieldInfo(currentPrompt));

			performTreeBackNavigation();
			const r = resolverRef.current;
			resolverRef.current = null;
			r?.({ __back: true });
		},
		[
			currentPrompt,
			setFieldValues,
			setVisitedPrompts,
			markFieldAsCompleted,
			addFieldToHistory,
			createFieldInfo,
			performTreeBackNavigation,
		]
	);

	const handleSubmit = useCallback(
		(value: any) => {
			if (resolverRef.current && currentPrompt) {
				if (currentPrompt.type !== "group") {
					// Handle special navigation values
					if (
						typeof value === "object" &&
						value?.__clearGroupAndBack
					) {
						handleClearGroupAndBack();
						return;
					}

					if (typeof value === "object" && value?.__preserveAndBack) {
						handlePreserveAndBack(value.value);
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

					// Update tree with submitted value
					try {
						treeManagerRef.current.updateNode(currentPrompt.id, {
							value: value,
							visited: true,
							completed: !currentPrompt.excludeFromCompleted,
						});
						setTreeRevision((prev) => prev + 1);
					} catch (error) {
						console.warn(
							"Tree update error (non-critical during migration):",
							error
						);
					}

					isNavigatingBack.current = false;

					// Mark field as completed and track history
					markFieldAsCompleted(currentPrompt, value);
					addFieldToHistory(
						currentPrompt,
						createFieldInfo(currentPrompt)
					);
				}
				const r = resolverRef.current;
				resolverRef.current = null;

				r(value);
			}
		},
		[
			currentPrompt,
			handleClearGroupAndBack,
			handlePreserveAndBack,
			markFieldAsCompleted,
			addFieldToHistory,
			createFieldInfo,
		]
	);

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
		const state = getSyncedState();
		const groupOrder = state.groupState.order;

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
	}, [currentGroup, getSyncedState]);

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
