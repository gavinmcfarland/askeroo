import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { flushSync } from "react-dom";
import { useInput } from "ink";
import { RecursiveGroupContainer } from "./RecursiveGroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { globalRegistry } from "../core/registry.js";
import { PromptTreeManager, PromptNode } from "../core/prompt-tree.js";
import {
	setTreeManager,
	notifyTreeChanged,
} from "../built-ins/completed-fields/completed-fields-store.js";
import { PromptRequest } from "../types/index.js";
import { applyInkRenderingFix } from "../utils/ink-rendering-fix.js";
import { notifyExternalStateChange } from "../core/plugin-state-context.js";

// Type declaration for debug utilities
declare global {
	interface Window {
		__promptTreeDebug?: any;
	}
	var __debugTree: (() => void) | undefined;
}

interface PromptAppProps {
	onReady: (promptFn: (request: PromptRequest) => Promise<any>) => void;
	runtime?: any; // Optional runtime instance for cancel handling
}

// Action types for unified field handler
type FieldAction =
	| { type: "submit"; value: any }
	| { type: "back" }
	| { type: "preserve-back"; value: any }
	| { type: "clear-group-back" };

// Tree-based state management

export function PromptApp({ onReady, runtime }: PromptAppProps) {
	// Core UI state
	const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(
		null
	);
	const [treeRevision, setTreeRevision] = useState(0);
	const [renderKey, setRenderKey] = useState(0); // Force complete remount on back navigation

	// Helper function to clone tree structure without circular references
	const cloneTreeForFreezing = useCallback((tree: any) => {
		const clonedNodeIndex = new Map();

		// First pass: clone all nodes without parent/children references
		const cloneNode = (node: any) => {
			if (clonedNodeIndex.has(node.id)) {
				return clonedNodeIndex.get(node.id);
			}

			const clonedNode = {
				...node,
				children: [], // Will be populated in second pass
				parent: undefined, // Will be set in second pass
			};

			clonedNodeIndex.set(node.id, clonedNode);
			return clonedNode;
		};

		// Clone all nodes
		tree.nodeIndex.forEach((node: any) => {
			cloneNode(node);
		});

		// Second pass: restore relationships
		tree.nodeIndex.forEach((originalNode: any) => {
			const clonedNode = clonedNodeIndex.get(originalNode.id);

			// Restore children
			clonedNode.children = originalNode.children.map((child: any) =>
				clonedNodeIndex.get(child.id)
			);

			// Restore parent
			if (originalNode.parent) {
				clonedNode.parent = clonedNodeIndex.get(originalNode.parent.id);
			}
		});

		// Clone the tree structure
		return {
			root: clonedNodeIndex.get(tree.root.id),
			nodeIndex: clonedNodeIndex,
			history: tree.history.map((node: any) =>
				clonedNodeIndex.get(node.id)
			),
		};
	}, []);

	// Function to freeze the current prompt
	const freezeCurrentPrompt = useCallback(() => {
		if (currentPrompt) {
			// Get the current active node
			const activeNode = treeManagerRef.current.getActiveNode();

			if (activeNode) {
				// Mark the node as frozen (keeping it active but frozen)
				activeNode.frozen = true;
				// Keep it active so it renders in its active state
				// activeNode.active remains true
			}

			// Clear current prompt to allow new prompts to be displayed after the frozen one
			setCurrentPrompt(null);

			// Trigger re-render to reflect the frozen state
			setTreeRevision((prev) => prev + 1);
		}
	}, [currentPrompt]);

	// Global Ctrl+C handler
	useInput((input, key) => {
		if (key.ctrl && input === "c") {
			// Only freeze current prompt if there are cancel callbacks
			// If no onCancel is defined, let the CLI exit immediately
			if (
				runtime &&
				runtime.hasCancelCallbacks &&
				runtime.hasCancelCallbacks()
			) {
				freezeCurrentPrompt();
			}

			// Then call the runtime's cancel handler
			if (runtime && runtime.handleCtrlC) {
				runtime.handleCtrlC();
			}
		}
	});

	// Tree management
	const treeManagerRef = useRef<PromptTreeManager>(new PromptTreeManager());

	// Consolidated refs - grouped by purpose
	const internalRefs = useRef({
		resolver: null as ((value: any) => void) | null,
		resolversByPromptId: new Map<string, (value: any) => void>(), // Store resolvers by prompt ID to handle async auto-submissions
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
						notifyTreeChanged();
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
					// Handle flow completion - mark all fields with values as completed
					treeManagerRef.current.traverseDepthFirst((node) => {
						if (node.type === "field" && node.value !== undefined) {
							node.completed = true;
							// excludeFromCompleted only affects completedFields component, not completion state
						}
					});

					// Deactivate the current active node so it can show in completed state
					const activeNode = treeManagerRef.current.getActiveNode();
					if (activeNode) {
						activeNode.active = false;
					}

					// Trigger re-render
					setTreeRevision((prev) => prev + 1);
					notifyTreeChanged();

					// Clear the current prompt so the active field transitions to completed state
					setCurrentPrompt(null);

					// Resolve immediately
					resolve(undefined);
					return;
				}

				// Handle group completion event (to trigger re-render)
				if (request.type === "groupCompleted") {
					// Mark the group as completed in the UI tree (since runtime tree is separate)
					const groupNode = treeManagerRef.current.getNode(
						request.id
					);
					if (groupNode) {
						groupNode.completed = true;
						groupNode.active = false;

						// For phased groups, ensure the last field is marked as completed
						if (groupNode.flow === "phased") {
							const allFields = groupNode.children.filter(
								(child) => child.type === "field"
							);
							const lastField = allFields[allFields.length - 1];
							const activeField = allFields.find(
								(field) => field.active
							);

							// Deactivate any currently active field
							if (activeField) {
								activeField.active = false;
							}

							// Mark the last field as completed
							if (lastField && !lastField.completed) {
								lastField.completed = true;
								lastField.active = false;
							}
						}

						// In phased flows, activate the next sibling when this group completes
						const parent = groupNode.parent;
						if (parent && parent.flow === "phased") {
							const siblings = parent.children;
							const currentIndex = siblings.indexOf(groupNode);
							const nextSibling = siblings[currentIndex + 1];

							if (
								nextSibling &&
								!nextSibling.active &&
								!nextSibling.completed
							) {
								nextSibling.active = true;
								nextSibling.visited = true;
							}
						}
					}

					// Trigger re-render to show updated tree state
					setTreeRevision((prev) => prev + 1);

					// Notify prompt state context (useExternalState handles caching)
					notifyExternalStateChange();

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
				// Also store by prompt ID to handle async auto-submissions correctly
				internalRefs.current.resolversByPromptId.set(
					request.id,
					resolve
				);

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
					// However, if we're in cancel mode, force all prompts to root level
					const isInCancelMode =
						runtime &&
						runtime.isInCancelMode &&
						runtime.isInCancelMode();
					const explicitParent = isInCancelMode
						? null
						: request.groupName || null;

					const addedNode = treeManagerRef.current.addPromptRequest(
						request,
						explicitParent
					);

					// Mark the node as a cancel prompt if we're in cancel mode
					if (isInCancelMode && addedNode) {
						addedNode.isCancelPrompt = true;
					}

					// Activate the prompt in the tree (crucial for rendering)
					if (request.type !== "group") {
						// Special handling: if there's a frozen prompt, don't deactivate it
						// Let both the frozen prompt and new prompt be active
						const activeNode =
							treeManagerRef.current.getActiveNode();
						if (activeNode && activeNode.frozen) {
							// Don't navigate away from frozen prompt, just add the new prompt as active too
							const newNode = treeManagerRef.current.getNode(
								request.id
							);
							if (newNode) {
								newNode.active = true;
								newNode.visited = true;
								// Add to history without deactivating the frozen node
								const currentHistory =
									treeManagerRef.current.getNavigationPath();
								if (!currentHistory.includes(newNode)) {
									// Manually add to history without using navigateTo
									treeManagerRef.current
										.getTree()
										.history.push(newNode);
								}
							}
						} else {
							treeManagerRef.current.navigateTo(request.id);
						}
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
					notifyTreeChanged();
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

					// Notify stores about tree changes
					notifyTreeChanged();
					notifyExternalStateChange(); // Legacy compatibility
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
			// Extract prompt ID from action if available (for async auto-submissions)
			const promptId = (action as any).__promptId;
			let effectivePrompt = promptId
				? { id: promptId, type: currentPrompt?.type }
				: currentPrompt;

			// If we have a promptId but no current prompt (e.g., during cancel), look up the node in the tree
			if (promptId && !currentPrompt) {
				const node = treeManagerRef.current.getNode(promptId);
				if (node) {
					effectivePrompt = { id: promptId, type: node.type };
				}
			}

			// Skip if no effective prompt or if it's a group
			if (!effectivePrompt || effectivePrompt.type === "group") {
				return;
			}

			const nodeId = effectivePrompt.id;
			let resolveValue: any;

			// Update tree based on action type
			switch (action.type) {
				case "submit": {
					// Regular submit - update tree with value
					// All submitted fields should be marked as completed
					// excludeFromCompleted only affects completedFields component, not the field's own completion state

					try {
						// Determine submission type based on submitted value
						// Components submit with format: { type: "auto" | "skip" | "programmatic", value?: any, deferCompletion?: boolean }
						// Regular values (non-objects or objects without type) are treated as manual submissions
						let submissionType:
							| "manual"
							| "auto"
							| "skipped"
							| "programmatic" = "manual";
						let actualValue = action.value;
						let deferCompletion = false;

						if (
							typeof action.value === "object" &&
							action.value !== null &&
							"type" in action.value
						) {
							// New consistent format: { type: "auto", value?: any, deferCompletion?: boolean }
							submissionType = action.value.type;
							actualValue = action.value.value;
							deferCompletion =
								action.value.deferCompletion === true;
						} else {
							// Regular value = manual submission
							submissionType = "manual";
							actualValue = action.value;
						}

						// Update node - only mark as completed if deferCompletion is false
						treeManagerRef.current.updateNode(nodeId, {
							value: actualValue,
							visited: true,
							completed: !deferCompletion, // Defer completion if requested
							submissionType: submissionType,
						});
					} catch (error) {
						console.warn(
							"Tree update error (non-critical):",
							error
						);
					}
					internalRefs.current.isNavigatingBack = false;
					// Extract actual value from submission object or use as-is
					resolveValue =
						typeof action.value === "object" &&
						action.value !== null &&
						"type" in action.value
							? action.value.value
							: action.value;
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
						// Mark as manual since user is explicitly preserving
						node.submissionType = "manual";
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

					// Notify stores about tree changes
					notifyTreeChanged();
					notifyExternalStateChange(); // Legacy compatibility

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

			// Notify stores about tree changes
			notifyTreeChanged();
			notifyExternalStateChange(); // Legacy compatibility

			// Resolve the promise
			// For async auto-submissions, use the resolver from the map
			const resolver =
				nodeId && internalRefs.current.resolversByPromptId.has(nodeId)
					? internalRefs.current.resolversByPromptId.get(nodeId)
					: internalRefs.current.resolver;

			// Clean up
			if (internalRefs.current.resolver === resolver) {
				internalRefs.current.resolver = null;
			}
			if (nodeId) {
				internalRefs.current.resolversByPromptId.delete(nodeId);
			}
			resolver?.(resolveValue);
		},
		[currentPrompt, performTreeBackNavigation]
	);

	// ========== SUBMIT HANDLER (with special value handling) ==========

	const handleSubmit = useCallback(
		(value: any) => {
			// Check if submission includes a captured prompt ID (for async auto-submissions)
			const promptId = value?.__promptId || currentPrompt?.id;

			// Use the resolver from the map if available, otherwise fall back to current resolver
			const resolver = promptId
				? internalRefs.current.resolversByPromptId.get(promptId) ||
				  internalRefs.current.resolver
				: internalRefs.current.resolver;

			if (!resolver) return;

			// Groups resolve immediately without going through field action
			if (currentPrompt && currentPrompt.type === "group") {
				const r = internalRefs.current.resolver;
				internalRefs.current.resolver = null;
				r?.(value);
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

			// Regular submit - pass along the captured prompt ID if available
			handleFieldAction({
				type: "submit",
				value,
				__promptId: value?.__promptId, // Pass the captured prompt ID for async auto-submissions
			} as any);
		},
		[currentPrompt, handleFieldAction]
	);

	const handleBack = useCallback(() => {
		handleFieldAction({ type: "back" });
	}, [handleFieldAction]);

	// Handler to mark a node as completed (for deferred completion)
	const handleComplete = useCallback((promptId: string) => {
		try {
			const node = treeManagerRef.current.getNode(promptId);
			if (node && !node.completed) {
				treeManagerRef.current.updateNode(promptId, {
					completed: true,
				});
				// Trigger re-render
				setTreeRevision((prev) => prev + 1);
				notifyTreeChanged();
				notifyExternalStateChange();
			}
		} catch (error) {
			console.warn("Error marking node as completed:", error);
		}
	}, []);

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

	// Primary rendering: Tree-based recursive rendering with support for frozen prompts

	// When custom root container exists, RecursiveGroupContainer will use it internally for the root node
	// Main content - renders both frozen prompt (if any) and current tree
	const content = (
		<>
			{/* Render the current tree - frozen nodes will render with isFrozen=true based on node.frozen property */}
			{currentTree.root && (
				<RecursiveGroupContainer
					key={renderKey}
					item={currentTree.root}
					treeManager={treeManagerRef.current}
					onSubmit={handleSubmit}
					onBack={handleBack}
					onComplete={handleComplete}
					onHintChange={handleHintChange}
					hintText={currentHintText}
					hintsByPromptId={internalRefs.current.hintsByPromptId}
				/>
			)}
		</>
	);

	// Otherwise, wrap in the default RootContainer
	const hasCustomContainer = !!(globalThis as any).__customRootContainer;

	if (hasCustomContainer) {
		return content;
	}

	// Default rendering with RootContainer wrapper
	return <RootContainer>{content}</RootContainer>;
}
