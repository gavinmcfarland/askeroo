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
import { setTreeManager } from "../../plugins/completed-fields/CompletedFieldsStore.js";
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

// Action types for unified field handler
type FieldAction =
	| { type: "submit"; value: any }
	| { type: "back" }
	| { type: "preserve-back"; value: any }
	| { type: "clear-group-back" };

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

	// Set tree manager for CompletedFields plugin (once on mount)
	useEffect(() => {
		setTreeManager(treeManagerRef.current);
	}, []);

	// Other non-grouped state
	const [currentGroup, setCurrentGroup] = useState<string | null>(null);
	const isNavigatingBack = useRef(false);

	const firstFieldIdRef = useRef<string | null>(null);
	// Track hint text per prompt ID - prevents hint flicker during navigation
	const hintsByPromptId = useRef<Map<string, React.ReactNode>>(new Map());

	// Add revision counter for static group conditional field updates
	const [staticGroupRevision, setStaticGroupRevision] = useState(0);

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
					treeManagerRef.current.traverseDepthFirst((node) => {
						if (
							node.type === "field" &&
							node.value !== undefined &&
							!node.excludeFromCompleted
						) {
							node.completed = true;
							// completionHistoryRef removed - tree tracks completion
						}
					});

					// Trigger re-render
					setTreeRevision((prev) => prev + 1);

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
					// Update currentPrompt and handle back navigation cleanup
					const shouldCleanup =
						isNavigatingBack.current && request.type !== "group";

					if (shouldCleanup) {
						isNavigatingBack.current = false;

						// Update tree: un-complete the field we're navigating back to
						const node = treeManagerRef.current.getNode(request.id);
						if (node && node.completed) {
							node.completed = false;
							// completionHistoryRef removed - tree tracks completion
						}

						setCurrentPrompt(request);
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

				// All field properties are now tracked in the tree automatically
				// Legacy tracking code removed - tree already has all this information

				// Group order is tracked in tree structure - no need for separate tracking
				// staticGroupsRef removed - use node.flow === "static" from tree instead

				// Update currentGroup based on the request
				if (request.type !== "group") {
					// Field prompts always update the group (most accurate)
					setCurrentGroup(request.groupName || null);
				} else if (request.type === "group") {
					// Group prompts update the group
					setCurrentGroup(request.id);
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

	// ========== NEW UNIFIED HANDLER ==========
	// Consolidates all field actions (submit, back, preserve-back, clear-group-back)
	const handleFieldAction = useCallback(
		(action: FieldAction) => {
			if (!currentPrompt || currentPrompt.type === "group") {
				return;
			}

			const nodeId = currentPrompt.id;
			let resolveValue: any;

			// Update tree based on action type
			switch (action.type) {
				case "submit": {
					// Regular submit - update tree with value
					try {
						treeManagerRef.current.updateNode(nodeId, {
							value: action.value,
							visited: true,
							completed: !currentPrompt.excludeFromCompleted,
						});
					} catch (error) {
						console.warn(
							"Tree update error (non-critical):",
							error
						);
					}
					isNavigatingBack.current = false;
					resolveValue = action.value;
					break;
				}

				case "back": {
					// Back navigation
					performTreeBackNavigation();
					isNavigatingBack.current = true;
					resolveValue = { __back: true };
					break;
				}

				case "preserve-back": {
					// Preserve value and go back
					const node = treeManagerRef.current.getNode(nodeId);
					if (node) {
						node.value = action.value;
						node.visited = true;
						node.completed = true; // Mark as completed when preserving
					}
					performTreeBackNavigation();
					resolveValue = { __back: true };
					break;
				}

				case "clear-group-back": {
					// Clear group and go back
					treeManagerRef.current.clearGroupAndGoBack(nodeId);
					resolveValue = { __back: true };
					break;
				}
			}

			// Trigger re-render
			setTreeRevision((prev) => prev + 1);

			// Resolve the promise
			const resolver = resolverRef.current;
			resolverRef.current = null;
			resolver?.(resolveValue);
		},
		[currentPrompt, performTreeBackNavigation]
	);

	// ========== OLD HANDLERS (kept for backward compatibility) ==========

	// Handler: Clear group and go back
	const handleClearGroupAndBack = useCallback(() => {
		// Delegate to unified handler
		handleFieldAction({ type: "clear-group-back" });
	}, [handleFieldAction]);

	// Handler: Preserve value and go back
	const handlePreserveAndBack = useCallback(
		(actualValue: any) => {
			// Delegate to unified handler
			handleFieldAction({ type: "preserve-back", value: actualValue });
		},
		[handleFieldAction]
	);

	const handleSubmit = useCallback(
		(value: any) => {
			if (!resolverRef.current || !currentPrompt) return;
			if (currentPrompt.type === "group") {
				// Groups resolve immediately
				const r = resolverRef.current;
				resolverRef.current = null;
				r(value);
				return;
			}

			// Handle special navigation values
			if (typeof value === "object" && value?.__clearGroupAndBack) {
				handleFieldAction({ type: "clear-group-back" });
				return;
			}

			if (typeof value === "object" && value?.__preserveAndBack) {
				handleFieldAction({
					type: "preserve-back",
					value: value.value,
				});
				return;
			}

			// Regular submit - delegate to unified handler
			handleFieldAction({ type: "submit", value });
		},
		[currentPrompt, handleFieldAction]
	);

	const handleBack = useCallback(() => {
		// Delegate to unified handler
		handleFieldAction({ type: "back" });
	}, [handleFieldAction]);

	// Track previous group to detect group completion
	const previousGroupRef = useRef<string | null>(null);

	// Detect group completion when transitioning between groups
	useEffect(() => {
		const prevGroup = previousGroupRef.current;
		const groupNodes = treeManagerRef.current.getNodesByType("group");
		const groupOrder = groupNodes.map((g) => g.id);

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
				// Group order is tracked in tree - no separate tracking needed
			}

			// Only mark as completed if we're moving forward in the sequence
			if (
				prevGroupIndex >= 0 &&
				effectiveCurrentGroupIndex >= 0 &&
				effectiveCurrentGroupIndex > prevGroupIndex
			) {
				// Group completion is tracked in tree - no separate state needed
				// The fake setter only triggered re-renders which already happen via tree updates
			}
		}

		// Also handle the case where we complete a group and move to a non-group prompt
		// This catches cases where the last group isn't followed by another group
		if (prevGroup && !currentGroup) {
			// Group completion is tracked in tree - no separate state needed
		}

		previousGroupRef.current = currentGroup;
	}, [currentGroup]);

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
