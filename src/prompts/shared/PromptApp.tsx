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
// Legacy GroupContainer available for emergency fallback only
import { GroupContainer } from "../group/GroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { globalRegistry } from "../../registry.js";
// import { initializeTasksInApp } from "../../plugins/tasks/index.js"; // Unused during tree migration
import { notifyStateUpdate } from "../../core/StateRegistry.js";
import { PromptTreeManager, PromptNode } from "../../core/PromptTree.js";
import { PromptTreeAdapter } from "../../core/PromptTreeAdapter.js";

// Type declaration for debug utilities
declare global {
	interface Window {
		__promptTreeDebug?: any;
	}
	var __enableRecursiveRendering: (() => void) | undefined;
	var __enableLegacyRendering: (() => void) | undefined;
	var __debugTree: (() => void) | undefined;
}

// Generic prompt request that works for all plugins
type PromptRequest = {
	type: string;
	id: string;
	label?: string; // Optional for group prompts
	groupName?: string; // Only present for field prompts
	flow?: "progressive" | "phased" | "static"; // Only present for group prompts
	discoveredFields?: Array<{ id: string; label: string; type: string }>; // Only present for group prompts
	enableArrowNavigation?: boolean; // Only present for group prompts
	excludeFromCompleted?: boolean; // If true, this field won't be added to completedFields
	hideAfterSubmit?: boolean; // If true, this field won't be rendered after completion
	allowBack?: boolean; // If false, prevents user from going back with escape key
	depth?: number; // Group nesting depth
	[key: string]: any; // Allow any additional properties for plugin-specific options
};

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
	depths: Map<string, number>; // Track depth of each group
}

interface PromptOrderState {
	root: Array<{ id: string; type: "field" | "group"; groupName?: string }>;
	rootFieldHistory: Array<FieldInfo>;
	staticGroupFields: Map<string, Array<FieldInfo>>;
	groupFieldHistory: Map<string, Array<FieldInfo>>;
}

export function PromptApp({ onReady }: PromptAppProps) {
	const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(
		null
	);
	// ⬇️ resolver kept in a ref to avoid re-renders
	const resolverRef = useRef<((value: any) => void) | null>(null);

	// Grouped state - this is the new source of truth
	const [fieldState, setFieldState] = useState<FieldState>({
		values: {},
		visited: new Set(),
		completed: new Set(),
		properties: new Map(),
		messages: {},
		groupNames: {},
		groupIds: {},
	});

	const [groupState, setGroupState] = useState<GroupState>({
		progressive: new Set(),
		phased: new Set(),
		static: new Set(),
		completed: new Set(),
		order: [],
		arrowNavigation: new Set(),
		depths: new Map(),
	});

	const [promptOrderState, setPromptOrderState] = useState<PromptOrderState>({
		root: [],
		rootFieldHistory: [],
		staticGroupFields: new Map(),
		groupFieldHistory: new Map(),
	});

	// NEW: Tree-based state management (parallel to existing state during migration)
	const treeManagerRef = useRef<PromptTreeManager>(new PromptTreeManager());
	const treeAdapterRef = useRef<PromptTreeAdapter>(new PromptTreeAdapter(treeManagerRef.current));
	const [treeRevision, setTreeRevision] = useState(0); // For forcing re-renders when tree changes
	const [useRecursiveRendering, setUseRecursiveRendering] = useState(true); // Recursive rendering enabled by default

	// Computed getters for backward compatibility (these maintain the original interface)
	const fieldValues = fieldState.values;
	const visitedPrompts = fieldState.visited;
	const completedFields = fieldState.completed;
	const fieldProperties = fieldState.properties;
	const fieldMessages = fieldState.messages;
	const fieldGroupNames = fieldState.groupNames;
	const fieldGroupIds = fieldState.groupIds;

	const progressiveGroups = groupState.progressive;
	const phaseGroups = groupState.phased;
	const staticGroups = groupState.static;
	const completedGroups = groupState.completed;
	const groupOrder = groupState.order;
	const arrowNavigationGroups = groupState.arrowNavigation;
	const groupDepths = groupState.depths;

	const rootPromptOrder = promptOrderState.root;
	const rootFieldHistory = promptOrderState.rootFieldHistory;
	const staticGroupFields = promptOrderState.staticGroupFields;
	const groupFieldHistory = promptOrderState.groupFieldHistory;

	// Helper setters that update the grouped state
	const setFieldValues = (
		updater: (prev: Record<string, any>) => Record<string, any>
	) => {
		setFieldState((prev) => ({ ...prev, values: updater(prev.values) }));
	};

	const setVisitedPrompts = (updater: (prev: Set<string>) => Set<string>) => {
		setFieldState((prev) => ({ ...prev, visited: updater(prev.visited) }));
	};

	const setCompletedFields = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		setFieldState((prev) => ({
			...prev,
			completed: updater(prev.completed),
		}));
	};

	const setFieldProperties = (
		updater: (prev: Map<string, any>) => Map<string, any>
	) => {
		setFieldState((prev) => ({
			...prev,
			properties: updater(prev.properties),
		}));
	};

	const setFieldMessages = (
		updater: (prev: Record<string, string>) => Record<string, string>
	) => {
		setFieldState((prev) => ({
			...prev,
			messages: updater(prev.messages),
		}));
	};

	const setFieldGroupNames = (
		updater: (prev: Record<string, string>) => Record<string, string>
	) => {
		setFieldState((prev) => ({
			...prev,
			groupNames: updater(prev.groupNames),
		}));
	};

	const setFieldGroupIds = (
		updater: (prev: Record<string, string>) => Record<string, string>
	) => {
		setFieldState((prev) => ({
			...prev,
			groupIds: updater(prev.groupIds),
		}));
	};

	const setProgressiveGroups = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		setGroupState((prev) => ({
			...prev,
			progressive: updater(prev.progressive),
		}));
	};

	const setPhaseGroups = (updater: (prev: Set<string>) => Set<string>) => {
		setGroupState((prev) => ({ ...prev, phased: updater(prev.phased) }));
	};

	const setStaticGroups = (updater: (prev: Set<string>) => Set<string>) => {
		setGroupState((prev) => ({ ...prev, static: updater(prev.static) }));
	};

	const setCompletedGroups = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		setGroupState((prev) => ({
			...prev,
			completed: updater(prev.completed),
		}));
	};

	const setGroupOrder = (updater: (prev: string[]) => string[]) => {
		setGroupState((prev) => ({ ...prev, order: updater(prev.order) }));
	};

	const setArrowNavigationGroups = (
		updater: (prev: Set<string>) => Set<string>
	) => {
		setGroupState((prev) => ({
			...prev,
			arrowNavigation: updater(prev.arrowNavigation),
		}));
	};

	const setGroupDepths = (
		updater: (prev: Map<string, number>) => Map<string, number>
	) => {
		setGroupState((prev) => ({
			...prev,
			depths: updater(prev.depths),
		}));
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
		setPromptOrderState((prev) => ({ ...prev, root: updater(prev.root) }));
	};

	const setRootFieldHistory = (
		updater: (prev: Array<FieldInfo>) => Array<FieldInfo>
	) => {
		setPromptOrderState((prev) => ({
			...prev,
			rootFieldHistory: updater(prev.rootFieldHistory),
		}));
	};

	const setStaticGroupFields = (
		updater: (
			prev: Map<string, Array<FieldInfo>>
		) => Map<string, Array<FieldInfo>>
	) => {
		setPromptOrderState((prev) => ({
			...prev,
			staticGroupFields: updater(prev.staticGroupFields),
		}));
	};

	const setGroupFieldHistory = (
		updater: (
			prev: Map<string, Array<FieldInfo>>
		) => Map<string, Array<FieldInfo>>
	) => {
		setPromptOrderState((prev) => ({
			...prev,
			groupFieldHistory: updater(prev.groupFieldHistory),
		}));
	};

	// Other non-grouped state
	const [currentGroup, setCurrentGroup] = useState<string | null>(null);
	const completionHistoryRef = useRef<string[]>([]);
	const groupIdToMessageRef = useRef<Map<string, string | undefined>>(
		new Map()
	);
	const isNavigatingBack = useRef(false);

	// Notify all registered plugins of state changes
	useEffect(() => {
		notifyStateUpdate({
			fieldState: {
				values: fieldValues,
				visited: visitedPrompts,
				completed: completedFields,
				properties: fieldProperties,
				messages: fieldMessages,
				groupNames: fieldGroupNames,
				groupIds: fieldGroupIds,
			},
			groupState: {
				progressive: progressiveGroups,
				phased: phaseGroups,
				static: staticGroups,
				completed: completedGroups,
				order: groupOrder,
				arrowNavigation: arrowNavigationGroups,
				depths: groupDepths,
			},
			currentGroup,
		});
	}, [
		fieldValues,
		visitedPrompts,
		completedFields,
		fieldProperties,
		fieldMessages,
		fieldGroupNames,
		fieldGroupIds,
		progressiveGroups,
		phaseGroups,
		staticGroups,
		completedGroups,
		groupOrder,
		arrowNavigationGroups,
		groupDepths,
		currentGroup,
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

	// Helper function to render field components dynamically
	const renderFieldComponent = (
		fieldInfo: { id: string; label: string; type: string },
		props: any,
		includeHintHandler = false
	) => {
		// Extract key from props to avoid React warning about spreading key
		const { key: propsKey, ...restProps } = props;
		const key = propsKey || `field-${fieldInfo.id}`;

		// Get the original field properties if available
		const originalProperties = fieldProperties.get(fieldInfo.id) || {};

		// Check for plugin components first
		const PluginComponent = globalRegistry.getComponent(fieldInfo.type);
		if (PluginComponent) {
			return (
				<PluginComponent
					key={key}
					message={fieldInfo.label}
					{...originalProperties} // Spread original properties like shortMessage
					{...restProps} // Spread rendering props (these take precedence)
					{...(includeHintHandler && {
						onHintChange: handleHintChange,
					})} // Only add hint handler for active fields
				/>
			);
		}

		// Fallback - return null if no plugin component found
		return null;
	};

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
					// Use the groupName from the request (set by the UI layer) or fall back to getCurrentGroup()
					const currentGroup = request.groupName || treeAdapterRef.current.getCurrentGroup();
					treeAdapterRef.current.addPromptRequestToTree(request, currentGroup);

					// Activate the prompt in the tree (crucial for rendering)
					if (request.type !== "group") {
						treeManagerRef.current.navigateTo(request.id);
					}

					// Force re-render to reflect tree changes
					setTreeRevision(prev => prev + 1);

					// Log tree structure for debugging
					if (process.env.NODE_ENV === 'development') {
						console.log('🌳 Tree updated for prompt:', request.id, request.type);
						console.log('🎯 Active node:', treeManagerRef.current.getActiveNode()?.id);
					}
				} catch (error) {
					console.warn('Tree management error (non-critical during migration):', error);
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
							completed: !currentPrompt.excludeFromCompleted
						});
						setTreeRevision(prev => prev + 1);
					} catch (error) {
						console.warn('Tree update error (non-critical during migration):', error);
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
					console.log('Tree navigation: went back to', result.node?.id);

					// Synchronize legacy state with tree state
					// Clear completed status for all nodes that were reset by goBack()
					const allNodes = treeManagerRef.current.findNodes(() => true);

					// Find all nodes that are no longer completed and remove them from legacy completed state
					const noLongerCompleted: string[] = [];
					allNodes.forEach((node: PromptNode) => {
						if (!node.completed && completedFields.has(node.id)) {
							noLongerCompleted.push(node.id);
						}
					});

					// Clear from legacy completed fields
					if (noLongerCompleted.length > 0) {
						setCompletedFields(prev => {
							const newCompleted = new Set(prev);
							noLongerCompleted.forEach(id => newCompleted.delete(id));
							return newCompleted;
						});
					}

					setTreeRevision(prev => prev + 1);
				}
			}
		} catch (error) {
			console.warn('Tree navigation error (non-critical during migration):', error);
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
	useEffect(() => {
		if (process.env.NODE_ENV === 'development' && treeRevision > 0) {
			const stats = treeManagerRef.current.getTreeStats();
			console.log('🌳 Tree stats:', stats);
		}
	}, [treeRevision]);

	// Note: Hints are now stored per prompt ID, so they don't leak between prompts
	// Non-interactive prompts simply won't set a hint, so currentHintText will be null for them

	// Completely ignore group prompts in render
	const effectivePrompt =
		currentPrompt?.type === "group" ? null : currentPrompt;

	// LEGACY: Render completed fields (only for emergency debugging)
	const renderCompletedFields = useMemo(() => {
		// Skip compilation if not needed
		if (useRecursiveRendering) return null;
		if (!currentGroup || phaseGroups.has(currentGroup)) {
			return null;
		}

		const isStaticGroup = staticGroups.has(currentGroup);
		const groupFields = isStaticGroup
			? staticGroupFields.get(currentGroup) || []
			: groupFieldHistory.get(currentGroup) || [];

		if (isStaticGroup) {
			// For static groups, render fields based on conditional visibility
			const executedFields = groupFieldHistory.get(currentGroup) || [];
			const discoveredFields = groupFields;

			// Create a unified list of fields, preferring executed fields over discovered ones
			const allFields = new Map();

			// Add discovered fields first
			discoveredFields.forEach((field) => {
				allFields.set(field.label + "|" + field.type, field);
			});

			// Add executed fields (they take precedence)
			executedFields.forEach((field) => {
				allFields.set(field.label + "|" + field.type, field);
			});

			const allFieldsArray = [...allFields.values()].filter(
				(field) => !field.hideAfterSubmit
			);

			return allFieldsArray.map((field, index) => {
				// For static groups, find the stored value by matching label and type
				// since field IDs might differ between discovery and execution
				let fieldValue = fieldValues[field.id];
				let isCompleted =
					fieldValue !== undefined &&
					(field.type !== "text" &&
					field.type !== "custom-text" &&
					field.type !== "validated-text"
						? true
						: typeof fieldValue === "string"
						? fieldValue.trim() !== ""
						: fieldValue);

				// If not found by direct ID match, search by label and type
				if (fieldValue === undefined) {
					for (const [storedId, storedValue] of Object.entries(
						fieldValues
					)) {
						// Check if this stored value belongs to a field with matching label and type in our group
						const matchingEntry = rootPromptOrder.find(
							(entry) =>
								entry.id === storedId &&
								entry.groupName === currentGroup
						);
						if (matchingEntry) {
							// Find the field info in group history to check label/type
							const allGroupFields =
								groupFieldHistory.get(currentGroup) || [];
							const matchingField = allGroupFields.find(
								(f) =>
									f.id === storedId &&
									f.label === field.label &&
									f.type === field.type
							);
							if (matchingField) {
								fieldValue = storedValue;
								// Apply same completion logic for consistency
								isCompleted =
									storedValue !== undefined &&
									(field.type !== "text" &&
									field.type !== "custom-text" &&
									field.type !== "validated-text"
										? true
										: typeof storedValue === "string"
										? storedValue.trim() !== ""
										: storedValue);
								break;
							}
						}
					}
				}

				// For static groups, match fields based on label and type since IDs might differ between discovery and execution
				const isActive = effectivePrompt
					? field.id === effectivePrompt.id ||
					  (field.label === effectivePrompt.label &&
							field.type === effectivePrompt.type)
					: false;

				// Get initial value based on field type
				const getInitialValue = () => {
					// Always return the stored value if it exists, regardless of completion status
					// This ensures that partially entered values are preserved during navigation
					if (fieldValue !== undefined) {
						return fieldValue;
					}
					// Type-specific defaults for truly new fields
					if (field.type === "multi") {
						return [];
					}
					if (field.type === "confirm") {
						return false;
					}
					return "";
				};

				// Get all properties from effectivePrompt when this field is active
				const typeSpecificProps: any = {};
				if (
					isActive &&
					effectivePrompt &&
					field.type === effectivePrompt.type
				) {
					// Pass all properties from the effective prompt except the base ones
					const { type, id, label, groupName, ...additionalProps } =
						effectivePrompt;
					Object.assign(typeSpecificProps, additionalProps);
				}

				// Determine position in group for navigation
				const isFirstInGroup = index === 0; // First field within this group
				const isLastInGroup = index === allFieldsArray.length - 1;
				const hasArrowNavigation =
					arrowNavigationGroups.has(currentGroup);

				// Check if this is the first prompt in the root flow (for static group fields)
				// This is true if this field is the very first field the user sees, regardless of grouping
				const isFirstRootPromptInStaticGroup =
					field.id === firstFieldIdRef.current;

				return renderFieldComponent(
					field,
					{
						key: `static-${field.label}-${field.type}`,
						initialValue: getInitialValue(),
						completed: isCompleted && !isActive,
						completedValue: isCompleted ? fieldValue : undefined,
						disabled: !isActive && !isCompleted,
						onSubmit: isActive ? handleSubmit : () => {},
						onBack: isActive ? handleBack : undefined,
						allowBack: isActive,
						flow: "static",
						isFirstInGroup,
						isLastInGroup,
						enableArrowNavigation: hasArrowNavigation,
						isFirstRootPrompt: isFirstRootPromptInStaticGroup,
						...typeSpecificProps,
					},
					isActive
				); // Pass hint handler only for active fields
			});
		} else {
			// For sequential groups, only show completed fields
			return groupFields
				.filter(
					(field) =>
						completedFields.has(field.id) &&
						field.id !== effectivePrompt?.id &&
						!field.hideAfterSubmit
				)
				.map((field) => {
					const fieldValue = fieldValues[field.id];

					return renderFieldComponent(field, {
						key: `completed-${field.id}`,
						completed: true,
						completedValue: fieldValue,
						onSubmit: () => {},
						allowBack: false,
						flow: phaseGroups.has(currentGroup!)
							? "phased"
							: undefined,
						// Allow plugins to handle their own defaults
					});
				});
		}
	}, [
		currentGroup,
		phaseGroups,
		staticGroups,
		staticGroupFields,
		groupFieldHistory,
		effectivePrompt,
		completedFields,
		fieldValues,
		rootPromptOrder,
		arrowNavigationGroups,
		firstFieldIdRef,
		staticGroupRevision,
	]);

	// LEGACY: Render completed items in order (only for emergency debugging)
	const renderCompletedItemsInOrder = useMemo(() => {
		// Skip compilation if not needed
		if (useRecursiveRendering) return null;
		// Only show items that come before the current prompt in the root order
		const currentPromptIndex = rootPromptOrder.findIndex(
			(p) => p.id === effectivePrompt?.id
		);
		const itemsToShow =
			currentPromptIndex >= 0
				? rootPromptOrder.slice(0, currentPromptIndex)
				: rootPromptOrder;

		return itemsToShow
			.map((entry) => {
				if (
					entry.type === "field" &&
					!entry.groupName &&
					completedFields.has(entry.id)
				) {
					// Render completed root-level field
					const fieldInfo = rootFieldHistory.find(
						(f) => f.id === entry.id
					);
					if (!fieldInfo || fieldInfo.hideAfterSubmit) return null;

					const fieldValue = fieldValues[entry.id];

					return renderFieldComponent(fieldInfo, {
						key: `completed-root-${entry.id}`,
						completed: true,
						completedValue: fieldValue,
						onSubmit: () => {},
						allowBack: false,
						flow: undefined, // Root fields have no flow type
						// Allow plugins to handle their own defaults
					});
				} else if (
					entry.type === "group" &&
					completedGroups.has(entry.id) &&
					entry.id !== currentGroup
				) {
					// Render completed group (but not if it's the current group being edited)
					const groupId = entry.id;
					const groupDisplayName = getGroupDisplayName(groupId);

					if (phaseGroups.has(groupId)) {
						// For phase groups, show a simple completion indicator
						// Only show if group has a label, otherwise show fields without group header
						const groupDepth = groupDepths.get(groupId) || 0;
						if (groupDisplayName) {
							return (
								<GroupContainer
									key={`completed-group-${groupId}`}
									groupName={groupDisplayName}
									completed={true}
									completedFields={null}
									depth={groupDepth}
								/>
							);
						} else {
							// Phase group without label - just show completion indicator without group header
							return (
								<GroupContainer
									key={`completed-group-${groupId}`}
									groupName={null}
									completed={true}
									completedFields={null}
									depth={groupDepth}
								/>
							);
						}
					} else {
						// For sequential groups, show detailed field completion using actual field components
						const groupFields =
							groupFieldHistory.get(groupId) || [];
						const completedGroupFieldComponents = groupFields
							.filter((field) => {
								// Only include fields that are actually completed AND belong to this group
								// Additional safety check to prevent root-level fields from appearing in groups
								const belongsToGroup =
									rootPromptOrder.find(
										(p) => p.id === field.id
									)?.groupName === groupId;
								return (
									completedFields.has(field.id) &&
									belongsToGroup
								);
							})
							.map((field) => {
								const fieldValue = fieldValues[field.id];
								return renderFieldComponent(field, {
									key: `completed-group-field-${field.id}`,
									completed: true,
									completedValue: fieldValue,
									onSubmit: () => {},
									allowBack: false,
									flow: phaseGroups.has(groupId)
										? "phased"
										: "static",
								});
							});

						const groupDepth = groupDepths.get(groupId) || 0;
						return (
							<GroupContainer
								key={`completed-group-${groupId}`}
								groupName={groupDisplayName} // Only show if there's actually a label
								completed={true}
								completedFields={completedGroupFieldComponents}
								depth={groupDepth}
							/>
						);
					}
				}
				return null;
			})
			.filter(Boolean);
	}, [
		rootPromptOrder,
		effectivePrompt,
		completedFields,
		completedGroups,
		currentGroup,
		phaseGroups,
		groupFieldHistory,
		fieldValues,
		rootFieldHistory,
		groupDepths,
	]);

	if (!effectivePrompt) {
		// Keep a stable shell so layout doesn't jump, but show completed groups and fields
		const currentGroupDepth = currentGroup
			? groupDepths.get(currentGroup) || 0
			: 0;
		return (
			<RootContainer>
				{renderCompletedItemsInOrder}
				<GroupContainer
					groupName={getGroupDisplayName(currentGroup)}
					depth={currentGroupDepth}
				>
					{renderCompletedFields}
				</GroupContainer>
			</RootContainer>
		);
	}

	// LEGACY: Field rendering (only for emergency debugging)
	let field: React.ReactNode = null;

	if (!useRecursiveRendering) {
		// For static groups, don't render the active field separately - it's part of the static group rendering
		const isCurrentGroupStatic = currentGroup && staticGroups.has(currentGroup);

		if (!isCurrentGroupStatic) {
		// Check if this is a plugin-provided prompt type
		const PluginComponent = globalRegistry.getComponent(
			effectivePrompt.type
		);

		if (PluginComponent) {
			const isInteractive = globalRegistry.isInteractive(
				effectivePrompt.type
			);
			const isSequentialGroup = !!(
				effectivePrompt.groupName &&
				!phaseGroups.has(effectivePrompt.groupName)
			);
			const hasCompletedFields =
				isSequentialGroup && completedFields.size > 0;
			const allowBack =
				effectivePrompt.allowBack !== false &&
				(effectivePrompt.id !== firstFieldIdRef.current ||
					hasCompletedFields);

			// Get initial value based on prompt type
			const getInitialValue = () => {
				if (!visitedPrompts.has(effectivePrompt.id)) {
					// Use initialValue from prompt or sensible default based on type
					if (effectivePrompt.initialValue !== undefined) {
						return effectivePrompt.initialValue;
					}
					// Return appropriate default based on field type
					if (effectivePrompt.type === "multi") {
						return [];
					}
					if (effectivePrompt.type === "confirm") {
						return false;
					}
					return "";
				}
				const storedValue = fieldValues[effectivePrompt.id];
				// Return stored value or prompt's initialValue with type-specific fallback
				if (storedValue !== undefined) {
					return storedValue;
				}
				if (effectivePrompt.initialValue !== undefined) {
					return effectivePrompt.initialValue;
				}
				// Type-specific defaults
				if (effectivePrompt.type === "multi") {
					return [];
				}
				if (effectivePrompt.type === "confirm") {
					return false;
				}
				return "";
			};

			// Check if this is the first prompt in the root flow
			// This is true if this field is the very first field the user sees, regardless of grouping
			const isFirstRootPrompt =
				effectivePrompt.id === firstFieldIdRef.current;

			// Check if this is the first field in its group
			const isFirstInGroup = effectivePrompt.groupName
				? // For grouped fields, check if this is the first field in the group's history
				  (() => {
						const groupHistory = groupFieldHistory.get(
							effectivePrompt.groupName
						);
						return (
							!groupHistory ||
							groupHistory.length === 0 ||
							groupHistory[0].id === effectivePrompt.id
						);
				  })()
				: // For root-level fields, they are not in a group, so always false
				  false;

			// Determine flow type based on current group
			const flowType =
				currentGroup && progressiveGroups.has(currentGroup)
					? "progressive"
					: currentGroup && phaseGroups.has(currentGroup)
					? "phased"
					: currentGroup && staticGroups.has(currentGroup)
					? "static"
					: "progressive"; // Default to progressive for groups with no flow specified

			field = (
				<PluginComponent
					key={effectivePrompt.id}
					{...effectivePrompt} // Spread all prompt properties
					initialValue={getInitialValue()}
					allowBack={allowBack}
					onSubmit={handleSubmit}
					onBack={handleBack}
					{...(isInteractive && { onHintChange: handleHintChange })}
					flow={flowType}
					isFirstRootPrompt={isFirstRootPrompt}
					isFirstInGroup={isFirstInGroup}
				/>
			);
		} else {
			// Fallback for unknown prompt types
			field = null;
		}
		}
	}

	const currentGroupDepth = currentGroup
		? groupDepths.get(currentGroup) || 0
		: 0;

	// NEW: Debug utilities (for console access during development)
	// Use: console.log(treeManagerRef.current.printTree()) in your debugging code

	// NEW: Debug utilities for CLI troubleshooting
	if (typeof globalThis !== 'undefined' && !globalThis.__enableLegacyRendering) {
		globalThis.__enableLegacyRendering = () => {
			setUseRecursiveRendering(false);
			console.log('⚠️ Legacy rendering enabled for debugging. Switch back with __enableRecursiveRendering()');
		};
		globalThis.__enableRecursiveRendering = () => {
			setUseRecursiveRendering(true);
			console.log('✅ Recursive rendering enabled (default).');
		};
		globalThis.__debugTree = () => {
			const tree = treeManagerRef.current.getTree();
			const stats = treeManagerRef.current.getTreeStats();
			console.log('🌳 Tree debug info:');
			console.log('Stats:', stats);
			console.log('Tree structure:');
			console.log(treeManagerRef.current.printTree());
			console.log('Root children:', tree.root.children.length);
			tree.root.children.forEach((child, i) => {
				console.log(`Child ${i}:`, {
					id: child.id,
					type: child.type,
					active: child.active,
					completed: child.completed,
					visited: child.visited
				});
			});
		};
	}

	// Tree-based recursive rendering (default and only method)
	const tree = treeManagerRef.current.getTree();

	// Legacy fallback available for emergency debugging only
	if (!useRecursiveRendering) {
		return (
			<RootContainer>
				{renderCompletedItemsInOrder}
				<GroupContainer
					key="group-container"
					groupName={getGroupDisplayName(currentGroup)}
					hintText={currentHintText}
					depth={currentGroupDepth}
				>
					{renderCompletedFields}
					{field}
				</GroupContainer>
			</RootContainer>
		);
	}

	// Primary rendering: Tree-based recursive rendering

	// Debug: Log tree state when in development
	if (process.env.NODE_ENV === 'development') {
		const stats = treeManagerRef.current.getTreeStats();
		if (stats.totalNodes > 1) { // More than just root
			console.log('🌳 Rendering tree with', stats.totalNodes, 'nodes, active:', stats.activeNodeId);
		}
	}

	return (
		<RootContainer>
			<RecursiveGroupContainer
				item={tree.root}
				treeManager={treeManagerRef.current}
				onSubmit={handleSubmit}
				onBack={handleBack}
				onHintChange={handleHintChange}
				hintText={currentHintText}
			/>
		</RootContainer>
	);
}
