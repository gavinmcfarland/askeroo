import React, { useState, useEffect, useRef } from "react";
import { useInput } from "ink";
import { GroupContainer } from "../group/GroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { CompletedGroup } from "../group/CompletedGroup.js";
import { globalRegistry } from "../../registry.js";

// Generic prompt request that works for all plugins
type PromptRequest = {
	type: string;
	id: string;
	message?: string; // Optional for group prompts
	groupName?: string; // Only present for field prompts
	flow?: "phased" | "static"; // Only present for group prompts
	discoveredFields?: Array<{id: string, message: string, type: string}>; // Only present for group prompts
	enableArrowNavigation?: boolean; // Only present for group prompts
	[key: string]: any; // Allow any additional properties for plugin-specific options
};

interface PromptAppProps {
	onReady: (promptFn: (request: PromptRequest) => Promise<any>) => void;
}

export function PromptApp({ onReady }: PromptAppProps) {
	const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(
		null
	);
	// ⬇️ resolver kept in a ref to avoid re-renders
	const resolverRef = useRef<((value: any) => void) | null>(null);

	const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
	const [visitedPrompts, setVisitedPrompts] = useState<Set<string>>(
		new Set()
	);
	const [currentGroup, setCurrentGroup] = useState<string | null>(null);
	const [completedFields, setCompletedFields] = useState<Set<string>>(
		new Set()
	);
	const [phaseGroups, setPhaseGroups] = useState<Set<string>>(new Set());
	const [staticGroups, setStaticGroups] = useState<Set<string>>(new Set());
	const [staticGroupFields, setStaticGroupFields] = useState<
		Map<string, Array<{ id: string; message: string; type: string }>>
	>(new Map());
	const [groupFieldHistory, setGroupFieldHistory] = useState<
		Map<string, Array<{ id: string; message: string; type: string }>>
	>(new Map());
	const [completedGroups, setCompletedGroups] = useState<Set<string>>(
		new Set()
	);
	const [groupOrder, setGroupOrder] = useState<string[]>([]);
	const [groupIdToMessage, setGroupIdToMessage] = useState<Map<string, string | undefined>>(new Map());
	const [rootPromptOrder, setRootPromptOrder] = useState<
		Array<{ id: string; type: "field" | "group"; groupName?: string }>
	>([]);
	const [rootFieldHistory, setRootFieldHistory] = useState<
		Array<{ id: string; message: string; type: string }>
	>([]);
	// Store complete field properties for proper rendering
	const [fieldProperties, setFieldProperties] = useState<
		Map<string, any>
	>(new Map());
	const firstFieldIdRef = useRef<string | null>(null);
	const staticGroupsRef = useRef<Set<string>>(new Set());
	// Static group navigation state
	const [staticGroupFocusIndex, setStaticGroupFocusIndex] = useState<Map<string, number>>(new Map());
	// Track groups with arrow navigation enabled
	const [arrowNavigationGroups, setArrowNavigationGroups] = useState<Set<string>>(new Set());

	// Helper function to get display name for a group
	const getGroupDisplayName = (groupId: string | null): string | null => {
		if (!groupId) return null;
		return groupIdToMessage.get(groupId) || null;
	};


	// Helper function to render field components dynamically
	const renderFieldComponent = (fieldInfo: { id: string; message: string; type: string }, props: any) => {
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
					message={fieldInfo.message}
					{...originalProperties} // Spread original properties like shortMessage
					{...restProps} // Spread rendering props (these take precedence)
				/>
			);
		}

		// Fallback - return null if no plugin component found
		return null;
	};

	useEffect(() => {
		const promptFn = (request: PromptRequest): Promise<any> => {
			return new Promise((resolve) => {
				if (request.type !== "group" && firstFieldIdRef.current === null) {
					firstFieldIdRef.current = request.id;
				}
				setCurrentPrompt(request);
				// ⬇️ assign without rendering
				resolverRef.current = resolve;

				// Store complete field properties for later rendering
			if (request.type !== "group") {
				setFieldProperties((prev) => {
					const newMap = new Map(prev);
					newMap.set(request.id, request);
					return newMap;
				});
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
					if (request.groupName && staticGroupsRef.current.has(request.groupName)) {
						setStaticGroupFields((prev) => {
							const newMap = new Map(prev);
							const groupFields = newMap.get(request.groupName!) || [];
							const fieldInfo = {
								id: request.id,
								message: request.message || `${request.type} field`,
								type: request.type,
							};

							// Only add if not already present (check by message and type to avoid duplicates from discovery vs execution)
							if (!groupFields.some((f) => f.message === fieldInfo.message && f.type === fieldInfo.type)) {
								newMap.set(request.groupName!, [...groupFields, fieldInfo]);
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

					// Track group ID to message mapping
					setGroupIdToMessage((prev) => {
						const newMap = new Map(prev);
						newMap.set(request.id, request.message);
						return newMap;
					});

					// Track group order using IDs
					setGroupOrder((prev) => {
						if (!prev.includes(request.id)) {
							return [...prev, request.id];
						}
						return prev;
					});
				}

				// Update currentGroup based on the request
				if (request.type !== "group") {
					// Field prompts always update the group (most accurate)
					setCurrentGroup(request.groupName || null);
				} else if (request.type === "group") {
					// Group prompts update the group (needed for initial display and cross-group nav)
					setCurrentGroup(request.id); // Use ID as the stable identifier

					// Track phased groups (non-default behavior)
					if (request.flow === "phased") {
						setPhaseGroups((prev) =>
							new Set(prev).add(request.id)
						);
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
						if (request.discoveredFields && request.discoveredFields.length > 0) {
							setStaticGroupFields((prev) => {
								const newMap = new Map(prev);
								newMap.set(request.id, request.discoveredFields!);
								return newMap;
							});
						}
					}
				}
			});
		};

		onReady(promptFn);
	}, [onReady]);

	const handleSubmit = (value: any) => {
		if (resolverRef.current && currentPrompt) {
			if (currentPrompt.type !== "group") {
				// Handle special navigation value that clears entire group and goes back
				if (typeof value === 'object' && value?.__clearGroupAndBack) {
					// Clear all fields in the current group
					if (currentPrompt.groupName) {
						// Find all fields that belong to this group and clear them
						setFieldValues((prev) => {
							const newFieldValues = { ...prev };

							// Remove all field values for fields in this group
							const groupName = currentPrompt.groupName;
							for (const [fieldId, _] of Object.entries(newFieldValues)) {
								// Check if this field belongs to the current group
								const fieldEntry = rootPromptOrder.find(entry => entry.id === fieldId && entry.groupName === groupName);
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
								const fieldEntry = rootPromptOrder.find(entry => entry.id === fieldId && entry.groupName === groupName);
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
								const fieldEntry = rootPromptOrder.find(entry => entry.id === fieldId && entry.groupName === groupName);
								if (fieldEntry) {
									newVisited.delete(fieldId);
								}
							}

							return newVisited;
						});
					}

					// Trigger back navigation
					const r = resolverRef.current;
					resolverRef.current = null;
					r({ __back: true });
					return;
				}

				// Handle special navigation value that preserves field content but goes back
				if (typeof value === 'object' && value?.__preserveAndBack) {
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
					const shouldMarkCompleted = currentPrompt.type !== 'text' &&
						currentPrompt.type !== 'custom-text' &&
						currentPrompt.type !== 'validated-text'
						? actualValue !== undefined
						: (typeof actualValue === 'string' ? actualValue.trim() !== '' : actualValue !== undefined);

					if (shouldMarkCompleted) {
						setCompletedFields((prev) =>
							new Set(prev).add(currentPrompt.id)
						);
					}

					// Handle group tracking for static groups
					if (currentPrompt.groupName) {
						const isStaticGroup = staticGroups.has(currentPrompt.groupName);

						if (isStaticGroup) {
							// Add current field to static group fields
							setStaticGroupFields((prev) => {
								const newMap = new Map(prev);
								const groupFields = newMap.get(currentPrompt.groupName!) || [];
								const fieldInfo = {
									id: currentPrompt.id,
									message: currentPrompt.message || `${currentPrompt.type} field`,
									type: currentPrompt.type,
								};

								// Only add if not already present
								if (!groupFields.some((f) => f.message === fieldInfo.message && f.type === fieldInfo.type)) {
									newMap.set(currentPrompt.groupName!, [...groupFields, fieldInfo]);
								}
								return newMap;
							});

							// Force re-render for conditional fields
							setStaticGroupFields((prev) => new Map(prev));
						}

						// Track in group history for non-phase groups
						const isPhaseGroup = phaseGroups.has(currentPrompt.groupName);
						if (!isPhaseGroup) {
							setGroupFieldHistory((prev) => {
								const newMap = new Map(prev);
								const groupFields = newMap.get(currentPrompt.groupName!) || [];
								const fieldInfo = {
									id: currentPrompt.id,
									message: currentPrompt.message || `${currentPrompt.type} field`,
									type: currentPrompt.type,
								};

								if (!groupFields.some((f) => f.id === currentPrompt.id)) {
									newMap.set(currentPrompt.groupName!, [...groupFields, fieldInfo]);
								}
								return newMap;
							});
						}
					} else {
						// For root-level fields, track in root history
						setRootFieldHistory((prev) => {
							const fieldInfo = {
								id: currentPrompt.id,
								message: currentPrompt.message || `${currentPrompt.type} field`,
								type: currentPrompt.type,
							};

							if (!prev.some((f) => f.id === currentPrompt.id)) {
								return [...prev, fieldInfo];
							}
							return prev;
						});
					}

					// Trigger back navigation
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

				// Mark field as completed and track history
				setCompletedFields((prev) =>
					new Set(prev).add(currentPrompt.id)
				);

				if (currentPrompt.groupName) {
					// For grouped fields, track in group history
					// Phase groups don't track history, static groups track all fields
					const isPhaseGroup = phaseGroups.has(currentPrompt.groupName);
					const isStaticGroup = staticGroups.has(currentPrompt.groupName);

					// For static groups, trigger field revelation when conditions are met
					if (isStaticGroup) {
						// First add the current field
						setStaticGroupFields((prev) => {
							const newMap = new Map(prev);
							const groupFields = newMap.get(currentPrompt.groupName!) || [];
							const fieldInfo = {
								id: currentPrompt.id,
								message: currentPrompt.message || `${currentPrompt.type} field`,
								type: currentPrompt.type,
							};

							// Only add if not already present (check by message and type)
							if (!groupFields.some((f) => f.message === fieldInfo.message && f.type === fieldInfo.type)) {
								newMap.set(currentPrompt.groupName!, [...groupFields, fieldInfo]);
							}
							return newMap;
						});

						// Force re-render when any field changes to reveal conditional fields
						// This allows any field to potentially trigger conditional field visibility
						// Force a re-render to trigger conditional field visibility checks
						// This will cause shouldDisplayField to re-evaluate with the new field value
						setStaticGroupFields((prev) => new Map(prev));
					}

					if (!isPhaseGroup) {
						setGroupFieldHistory((prev) => {
							const newMap = new Map(prev);
							const groupFields =
								newMap.get(currentPrompt.groupName!) || [];
							const fieldInfo = {
								id: currentPrompt.id,
								message: currentPrompt.message || `${currentPrompt.type} field`,
								type: currentPrompt.type,
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
							message: currentPrompt.message || `${currentPrompt.type} field`,
							type: currentPrompt.type,
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
			// resolve immediately; let the controller switch the prompt
			r(value);
		}
	};

	const handleBack = () => {
		if (resolverRef.current && currentPrompt) {
			// ⬇️ Defer cleanup so there's no intermediate frame before the controller
			// installs the previous prompt. This avoids the flicker.
			const toMaybeDelete = currentPrompt.id;

			const r = resolverRef.current;
			resolverRef.current = null;

			// Resolve first (previous prompt will be pushed synchronously/soon).
			r({ __back: true });

			// Cleanup visited prompts and completed fields immediately
			setVisitedPrompts((prev) => {
				if (!prev.has(toMaybeDelete)) return prev;
				const next = new Set(prev);
				next.delete(toMaybeDelete);
				return next;
			});

			setCompletedFields((prev) => {
				if (!prev.has(toMaybeDelete)) return prev;
				const next = new Set(prev);
				next.delete(toMaybeDelete);
				return next;
			});

			// Clear the field value to reset it to initial state
			setFieldValues((prev) => {
				if (!(toMaybeDelete in prev)) return prev;
				const next = { ...prev };
				delete next[toMaybeDelete];
				return next;
			});

			// When navigating back, unmark any groups that should no longer be considered completed
			const currentPromptGroup =
				currentPrompt.type === "group"
					? currentPrompt.id  // Use the stable group ID, not the message
					: currentPrompt.groupName;

			// Consolidate group completion cleanup in a single state update
			if (currentPromptGroup) {
				const currentGroupIndex =
					groupOrder.indexOf(currentPromptGroup);
				setCompletedGroups((prev) => {
					const next = new Set(prev);

					// Remove the current group if it was marked as completed
					if (next.has(currentPromptGroup)) {
						next.delete(currentPromptGroup);
					}

					// Remove any groups that come after the current group in the sequence
					if (currentGroupIndex >= 0) {
						groupOrder.forEach((groupName, index) => {
							if (index > currentGroupIndex) {
								next.delete(groupName);
							}
						});
					}

					return next;
				});
			}
		}
	};

	// Track previous group to detect group completion
	const previousGroupRef = useRef<string | null>(null);

	// Detect group completion when transitioning between groups
	useEffect(() => {
		const prevGroup = previousGroupRef.current;

		// console.log('Group transition check:', {
		// 	prevGroup,
		// 	currentGroup,
		// 	groupOrder,
		// 	phaseGroups: Array.from(phaseGroups)
		// });

		// Only mark a group as completed when moving to a LATER group in the sequence
		// This prevents marking groups as completed when navigating backwards
		if (prevGroup && currentGroup && prevGroup !== currentGroup) {
			const prevGroupIndex = groupOrder.indexOf(prevGroup);
			let currentGroupIndex = groupOrder.indexOf(currentGroup);

			// If current group is not in groupOrder yet, calculate what its index would be
			let effectiveCurrentGroupIndex = currentGroupIndex;
			if (currentGroupIndex === -1) {
				// console.log('Missing group detected, will add to order:', currentGroup);
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

			// console.log('Forward transition check:', {
			// 	prevGroup,
			// 	currentGroup,
			// 	prevGroupIndex,
			// 	currentGroupIndex,
			// 	effectiveCurrentGroupIndex,
			// 	willMarkComplete: prevGroupIndex >= 0 && effectiveCurrentGroupIndex >= 0 && effectiveCurrentGroupIndex > prevGroupIndex
			// });

			// Only mark as completed if we're moving forward in the sequence
			if (
				prevGroupIndex >= 0 &&
				effectiveCurrentGroupIndex >= 0 &&
				effectiveCurrentGroupIndex > prevGroupIndex
			) {
				// console.log('Marking group as completed:', prevGroup);
				setCompletedGroups((prev) => new Set(prev).add(prevGroup));
			}
		}

		// Also handle the case where we complete a group and move to a non-group prompt
		// This catches cases where the last group isn't followed by another group
		if (prevGroup && !currentGroup) {
			// console.log('Group to root transition - marking complete:', prevGroup);
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

	// Completely ignore group prompts in render
	const effectivePrompt =
		currentPrompt?.type === "group" ? null : currentPrompt;


	// Helper function to determine if a field should be displayed based on conditions
	const shouldDisplayField = (field: { id: string; message: string; type: string }, executedFields: Array<{ id: string; message: string; type: string }>) => {
		// Always show executed fields
		if (executedFields.some(f => f.message === field.message && f.type === field.type)) {
			return true;
		}

		// For non-executed fields, show them all initially
		// The runtime will handle the discovery and conditional logic internally
		// This makes the static flow generic and not dependent on specific field names
		return true;
	};

	// Helper function to get field values by field information
	const getFieldValue = (fieldInfo: { id: string; message: string; type: string }) => {
		// Get the actual submitted value for this field
		return fieldValues[fieldInfo.id];
	};


	// Render completed fields for all groups (sequential by default)
	const renderCompletedFields = () => {
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
			discoveredFields.forEach(field => {
				allFields.set(field.message + '|' + field.type, field);
			});

			// Add executed fields (they take precedence)
			executedFields.forEach(field => {
				allFields.set(field.message + '|' + field.type, field);
			});

			const allFieldsArray = Array.from(allFields.values());

			return allFieldsArray
				.map((field, index) => {
					// For static groups, find the stored value by matching message and type
					// since field IDs might differ between discovery and execution
					let fieldValue = fieldValues[field.id];
					let isCompleted = fieldValue !== undefined && (
						field.type !== 'text' && field.type !== 'custom-text' && field.type !== 'validated-text'
						? true
						: (typeof fieldValue === 'string' ? fieldValue.trim() !== '' : fieldValue)
					);

					// If not found by direct ID match, search by message and type
					if (fieldValue === undefined) {
						for (const [storedId, storedValue] of Object.entries(fieldValues)) {
							// Check if this stored value belongs to a field with matching message and type in our group
							const matchingEntry = rootPromptOrder.find(entry =>
								entry.id === storedId &&
								entry.groupName === currentGroup
							);
							if (matchingEntry) {
								// Find the field info in group history to check message/type
								const allGroupFields = groupFieldHistory.get(currentGroup) || [];
								const matchingField = allGroupFields.find(f =>
									f.id === storedId &&
									f.message === field.message &&
									f.type === field.type
								);
								if (matchingField) {
									fieldValue = storedValue;
									// Apply same completion logic for consistency
									isCompleted = storedValue !== undefined && (
										field.type !== 'text' && field.type !== 'custom-text' && field.type !== 'validated-text'
										? true
										: (typeof storedValue === 'string' ? storedValue.trim() !== '' : storedValue)
									);
									break;
								}
							}
						}
					}

					// For static groups, match fields based on message and type since IDs might differ between discovery and execution
					const isActive = effectivePrompt ?
						(field.id === effectivePrompt.id ||
						 (field.message === effectivePrompt.message && field.type === effectivePrompt.type))
						: false;

					// Get initial value based on field type
					const getInitialValue = () => {
						// Always return the stored value if it exists, regardless of completion status
						// This ensures that partially entered values are preserved during navigation
						if (fieldValue !== undefined) {
							return fieldValue;
						}
						// Type-specific defaults for truly new fields
						if (field.type === 'multi') {
							return [];
						}
						if (field.type === 'confirm') {
							return false;
						}
						return "";
					};

					// Get all properties from effectivePrompt when this field is active
					const typeSpecificProps: any = {};
					if (isActive && effectivePrompt && field.type === effectivePrompt.type) {
						// Pass all properties from the effective prompt except the base ones
						const { type, id, message, groupName, ...additionalProps } = effectivePrompt;
						Object.assign(typeSpecificProps, additionalProps);
					}

					// Determine position in group for navigation
					const isFirstInGroup = index === 0;
					const isLastInGroup = index === allFieldsArray.length - 1;
					const hasArrowNavigation = arrowNavigationGroups.has(currentGroup);

					return renderFieldComponent(field, {
						key: `static-${field.message}-${field.type}`,
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
						...typeSpecificProps
					});
				});
		} else {
			// For sequential groups, only show completed fields
			return groupFields
				.filter(
					(field) =>
						completedFields.has(field.id) &&
						field.id !== effectivePrompt?.id
				)
				.map((field) => {
					const fieldValue = fieldValues[field.id];

					return renderFieldComponent(field, {
						key: `completed-${field.id}`,
						completed: true,
						completedValue: fieldValue,
						onSubmit: () => {},
						allowBack: false,
						flow: phaseGroups.has(currentGroup!) ? "phased" : undefined,
						// Allow plugins to handle their own defaults
					});
				});
		}
	};

	// Render completed items in execution order
	const renderCompletedItemsInOrder = () => {
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
				if (entry.type === "field" && !entry.groupName && completedFields.has(entry.id)) {
					// Render completed root-level field
					const fieldInfo = rootFieldHistory.find((f) => f.id === entry.id);
					if (!fieldInfo) return null;

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
				} else if (entry.type === "group" && completedGroups.has(entry.id) && entry.id !== currentGroup) {
					// Render completed group (but not if it's the current group being edited)
					const groupId = entry.id;
					const groupDisplayName = getGroupDisplayName(groupId);

					if (phaseGroups.has(groupId)) {
						// For phase groups, show a simple completion indicator
						// Only show if group has a message, otherwise show fields without group header
						if (groupDisplayName) {
							return (
								<CompletedGroup
									key={`completed-group-${groupId}`}
									groupName={groupDisplayName}
									completedFields={[
										{
											id: "phase-completed",
											message: "Completed",
											value: "✓",
											type: "completed",
										},
									]}
								/>
							);
						} else {
							// Phase group without message - just show completion indicator without group header
							return (
								<CompletedGroup
									key={`completed-group-${groupId}`}
									groupName={null}
									completedFields={[
										{
											id: "phase-completed",
											message: "Completed",
											value: "✓",
											type: "completed",
										},
									]}
								/>
							);
						}
					} else {
						// For sequential groups, show detailed field completion
						const groupFields = groupFieldHistory.get(groupId) || [];
						const completedGroupFields = groupFields
							.filter((field) => {
								// Only include fields that are actually completed AND belong to this group
								// Additional safety check to prevent root-level fields from appearing in groups
								const belongsToGroup =
									rootPromptOrder.find((p) => p.id === field.id)
										?.groupName === groupId;
								return (
									completedFields.has(field.id) && belongsToGroup
								);
							})
							.map((field) => ({
								id: field.id,
								message: field.message,
								value: fieldValues[field.id],
								type: field.type,
							}));

						return (
							<CompletedGroup
								key={`completed-group-${groupId}`}
								groupName={groupDisplayName} // Only show if there's actually a message
								completedFields={completedGroupFields}
							/>
						);
					}
				}
				return null;
			})
			.filter(Boolean);
	};

	if (!effectivePrompt) {
		// Keep a stable shell so layout doesn't jump, but show completed groups and fields
		return (
			<RootContainer>
				{renderCompletedItemsInOrder()}
				<GroupContainer groupName={getGroupDisplayName(currentGroup)}>
					{renderCompletedFields()}
				</GroupContainer>
			</RootContainer>
		);
	}

	// For static groups, don't render the active field separately - it's part of the static group rendering
	const isCurrentGroupStatic = currentGroup && staticGroups.has(currentGroup);
	let field: React.ReactNode = null;

	if (!isCurrentGroupStatic) {
		// Check if this is a plugin-provided prompt type
		const PluginComponent = globalRegistry.getComponent(effectivePrompt.type);

		if (PluginComponent) {
			const isSequentialGroup = !!(
				effectivePrompt.groupName &&
				!phaseGroups.has(effectivePrompt.groupName)
			);
			const hasCompletedFields =
				isSequentialGroup && completedFields.size > 0;
			const allowBack =
				effectivePrompt.id !== firstFieldIdRef.current ||
				hasCompletedFields;

			// Get initial value based on prompt type
			const getInitialValue = () => {
				if (!visitedPrompts.has(effectivePrompt.id)) {
					// Use initialValue from prompt or sensible default based on type
					if (effectivePrompt.initialValue !== undefined) {
						return effectivePrompt.initialValue;
					}
					// Return appropriate default based on field type
					if (effectivePrompt.type === 'multi') {
						return [];
					}
					if (effectivePrompt.type === 'confirm') {
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
				if (effectivePrompt.type === 'multi') {
					return [];
				}
				if (effectivePrompt.type === 'confirm') {
					return false;
				}
				return "";
			};

			// Determine flow type based on current group
			const flowType = currentGroup && phaseGroups.has(currentGroup) ? "phased" :
							currentGroup && staticGroups.has(currentGroup) ? "static" :
							undefined;

			field = (
				<PluginComponent
					key={effectivePrompt.id}
					{...effectivePrompt} // Spread all prompt properties
					initialValue={getInitialValue()}
					allowBack={allowBack}
					onSubmit={handleSubmit}
					onBack={handleBack}
					flow={flowType}
				/>
			);
		} else {
			// Fallback for unknown prompt types
			field = null;
		}
	}

	return (
		<RootContainer>
			{renderCompletedItemsInOrder()}
			<GroupContainer key="group-container" groupName={getGroupDisplayName(currentGroup)}>
				{renderCompletedFields()}
				{field}
			</GroupContainer>
		</RootContainer>
	);
}
