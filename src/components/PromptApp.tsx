import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { flushSync } from "react-dom";
import { RecursiveGroupContainer } from "./RecursiveGroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { globalRegistry } from "../core/registry.js";
import { PromptTreeManager, PromptNode } from "../core/prompt-tree.js";
import { setTreeManager } from "../built-ins/completed-fields/completed-fields-store.js";
import { PromptRequest } from "../types/index.js";
import { applyInkRenderingFix } from "../utils/ink-rendering-fix.js";

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
	// Core UI state
	const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(
		null
	);
	const [treeRevision, setTreeRevision] = useState(0);
	const [renderKey, setRenderKey] = useState(0); // Force complete remount on back navigation

	// Tree management
	const treeManagerRef = useRef<PromptTreeManager>(new PromptTreeManager());

	// Consolidated refs - grouped by purpose
	const internalRefs = useRef({
		resolver: null as ((value: any) => void) | null,
		isNavigatingBack: false,
		firstFieldId: null as string | null,
		hintsByPromptId: new Map<string, React.ReactNode>(),
	});

	// Memoized tree to ensure UI updates when tree structure changes
	const currentTree = useMemo(() => {
		return treeManagerRef.current.getTree();
	}, [treeRevision]);

	// Set tree manager for CompletedFields plugin (once on mount)
	useEffect(() => {
		setTreeManager(treeManagerRef.current);
	}, []);

	// Handler for when fields provide hint text - stores per prompt ID
	const handleHintChange = useCallback(
		(hint: React.ReactNode) => {
			if (currentPrompt?.id) {
				// Only store non-null hints to prevent flicker during back navigation
				// When a field becomes inactive, plugins send null, but we want to
				// preserve the last known hint so it displays immediately on back nav
				if (hint !== null) {
					internalRefs.current.hintsByPromptId.set(
						currentPrompt.id,
						hint
					);
					// Use flushSync to make hint update synchronous and prevent blinking
					flushSync(() => {
						setTreeRevision((prev) => prev + 1);
					});
				}
			}
		},
		[currentPrompt?.id]
	);

	// Get hint for the ACTIVE node from the tree (not currentPrompt)
	// This ensures hint stays in sync with tree state during navigation
	// The flushSync in handleHintChange ensures new hint appears synchronously
	const activeNode = treeManagerRef.current.getActiveNode();
	const currentHintText = activeNode?.id
		? internalRefs.current.hintsByPromptId.get(activeNode.id) || null
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

					// Deactivate the current active node so it can show in completed state
					const activeNode = treeManagerRef.current.getActiveNode();
					if (activeNode) {
						activeNode.active = false;
					}

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
					internalRefs.current.firstFieldId === null &&
					!globalRegistry.shouldAutoSubmit(request.type)
				) {
					internalRefs.current.firstFieldId = request.id;
				}

				// IMPORTANT: Assign resolver BEFORE updating state
				// This ensures the useEffect can access the resolver immediately
				internalRefs.current.resolver = resolve;

				// Use flushSync to ensure both updates happen atomically in a single render
				flushSync(() => {
					// Update currentPrompt and handle back navigation cleanup
					const shouldCleanup =
						internalRefs.current.isNavigatingBack &&
						request.type !== "group";

					if (shouldCleanup) {
						internalRefs.current.isNavigatingBack = false;

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

				// NEW: Add prompt to tree structure and activate it
				try {
					// SIMPLIFIED: Runtime provides explicit parent via request.groupName
					// This is the groupStack context from the runtime (which knows the exact parent)
					const explicitParent = request.groupName || null;

					treeManagerRef.current.addPromptRequest(
						request,
						explicitParent
					);

					// Activate the prompt in the tree (crucial for rendering)
					if (request.type !== "group") {
						treeManagerRef.current.navigateTo(request.id);
					} else {
						// Mark group as visited and active so it shows up in the tree
						const groupNode = treeManagerRef.current.getNode(
							request.id
						);
						if (groupNode) {
							groupNode.visited = true;
							groupNode.active = true; // Mark as active so it renders
						}
					}

					// Force re-render to reflect tree changes
					setTreeRevision((prev) => prev + 1);
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
				// currentGroup removed - use treeManager.getCurrentGroupId() if needed
			});
		};

		onReady(promptFn);
	}, [onReady]);

	// Extract tree navigation and synchronization logic to be used by all back navigation paths
	const performTreeBackNavigation = useCallback(() => {
		try {
			const canGoBack = treeManagerRef.current.canGoBack();
			if (canGoBack) {
				// Perform tree navigation
				const result = treeManagerRef.current.goBack();
				if (result.success) {
					// Apply Ink rendering timing fix AFTER tree mutation but BEFORE React update
					// This ensures tree is in consistent state before triggering re-render
					applyInkRenderingFix();

					// Use flushSync to ensure tree state updates are applied synchronously
					flushSync(() => {
						setTreeRevision((prev) => prev + 1);
						// Force a complete remount to prevent duplication issues
						// when Ink has to redraw the entire terminal (e.g., in short terminals)
						setRenderKey((prev) => prev + 1);
					});
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
					internalRefs.current.isNavigatingBack = false;
					resolveValue = action.value;
					break;
				}

				case "back": {
					// Back navigation - performTreeBackNavigation handles its own state update
					performTreeBackNavigation();
					internalRefs.current.isNavigatingBack = true;
					resolveValue = { __back: true };
					// IMPORTANT: Don't trigger additional re-render, performTreeBackNavigation already did it
					// Resolve promise and return early
					const resolver = internalRefs.current.resolver;
					internalRefs.current.resolver = null;
					resolver?.(resolveValue);
					return;
				}

				case "preserve-back": {
					// Preserve value and go back - performTreeBackNavigation handles its own state update
					const node = treeManagerRef.current.getNode(nodeId);
					if (node) {
						node.value = action.value;
						node.visited = true;
						node.completed = true; // Mark as completed when preserving
					}
					performTreeBackNavigation();
					internalRefs.current.isNavigatingBack = true;
					resolveValue = { __back: true };
					// IMPORTANT: Don't trigger additional re-render, performTreeBackNavigation already did it
					// Resolve promise and return early
					const resolver = internalRefs.current.resolver;
					internalRefs.current.resolver = null;
					resolver?.(resolveValue);
					return;
				}

				case "clear-group-back": {
					// Clear group and go back
					treeManagerRef.current.clearGroupAndGoBack(nodeId);
					// Apply Ink rendering timing fix AFTER tree mutation but BEFORE React update
					applyInkRenderingFix();
					// Use flushSync for immediate state update
					flushSync(() => {
						setTreeRevision((prev) => prev + 1);
						// Force a complete remount to prevent duplication issues
						setRenderKey((prev) => prev + 1);
					});

					internalRefs.current.isNavigatingBack = true;
					resolveValue = { __back: true };
					// Resolve promise and return early (already triggered re-render)
					const resolver = internalRefs.current.resolver;
					internalRefs.current.resolver = null;
					resolver?.(resolveValue);
					return;
				}
			}

			// Trigger re-render for submit actions only
			setTreeRevision((prev) => prev + 1);

			// Resolve the promise
			const resolver = internalRefs.current.resolver;
			internalRefs.current.resolver = null;
			resolver?.(resolveValue);
		},
		[currentPrompt, performTreeBackNavigation]
	);

	// ========== SUBMIT HANDLER (with special value handling) ==========

	const handleSubmit = useCallback(
		(value: any) => {
			if (!internalRefs.current.resolver || !currentPrompt) return;

			// Groups resolve immediately without going through field action
			if (currentPrompt.type === "group") {
				const r = internalRefs.current.resolver;
				internalRefs.current.resolver = null;
				r(value);
				return;
			}

			// Handle special navigation values that plugins might send
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

			// Regular submit
			handleFieldAction({ type: "submit", value });
		},
		[currentPrompt, handleFieldAction]
	);

	const handleBack = useCallback(() => {
		handleFieldAction({ type: "back" });
	}, [handleFieldAction]);

	// Auto-resolve group prompts
	useEffect(() => {
		if (currentPrompt?.type === "group" && internalRefs.current.resolver) {
			const r = internalRefs.current.resolver;
			internalRefs.current.resolver = null;
			r(undefined);
		}
	}, [currentPrompt]);

	// Note: Hints are now stored per prompt ID, so they don't leak between prompts
	// Auto-submit prompts simply won't set a hint, so currentHintText will be null for them

	// Primary rendering: Tree-based recursive rendering

	// When custom root container exists, RecursiveGroupContainer will use it internally for the root node
	// Otherwise, wrap in the default RootContainer
	const hasCustomContainer = !!(globalThis as any).__customRootContainer;

	if (hasCustomContainer) {
		// Custom container will be applied at the root node level inside RecursiveGroupContainer
		return (
			<RecursiveGroupContainer
				key={renderKey}
				item={currentTree.root}
				treeManager={treeManagerRef.current}
				onSubmit={handleSubmit}
				onBack={handleBack}
				onHintChange={handleHintChange}
				hintText={currentHintText}
			/>
		);
	}

	// Default rendering with RootContainer wrapper
	return (
		<RootContainer>
			<RecursiveGroupContainer
				key={renderKey}
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
