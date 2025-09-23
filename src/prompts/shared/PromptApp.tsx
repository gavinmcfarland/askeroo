import React, { useState, useEffect, useRef } from "react";
import { TextField } from "../text/TextField.js";
import { ConfirmField } from "../confirm/ConfirmField.js";
import { CustomTextField } from "../custom-text/CustomTextField.js";
import { ValidatedTextField } from "../validated-text/ValidatedTextField.js";
import { MultiField } from "../multi/MultiField.js";
import { GroupContainer } from "../group/GroupContainer.js";
import { RootContainer } from "./RootContainer.js";
import { CompletedGroup } from "../group/CompletedGroup.js";

type PromptRequest =
	| {
			type: "text";
			id: string;
			message: string;
			initial?: string;
			groupName?: string;
	  }
	| {
			type: "confirm";
			id: string;
			message: string;
			initial?: boolean;
			groupName?: string;
	  }
	| {
			type: "customText";
			id: string;
			message: string;
			placeholder?: string;
			prefix?: string;
			groupName?: string;
	  }
	| {
			type: "validatedText";
			id: string;
			message: string;
			validate?: (value: string) => string | true;
			transform?: (value: string) => string;
			groupName?: string;
	  }
	| {
			type: "multi";
			id: string;
			message: string;
			options?: string[];
			groupName?: string;
	  }
	| { type: "group"; id: string; message?: string; flow?: "phase" | "static"; discoveredFields?: Array<{id: string, message: string, type: string}> };

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
	const firstFieldIdRef = useRef<string | null>(null);
	const staticGroupsRef = useRef<Set<string>>(new Set());

	// Helper function to get display name for a group
	const getGroupDisplayName = (groupId: string | null): string | null => {
		if (!groupId) return null;
		return groupIdToMessage.get(groupId) || null;
	};

	useEffect(() => {
		const promptFn = (request: PromptRequest): Promise<any> => {
			return new Promise((resolve) => {
				if (
					request.type !== "group" &&
					firstFieldIdRef.current === null
				) {
					firstFieldIdRef.current = request.id;
				}
				setCurrentPrompt(request);
				// ⬇️ assign without rendering
				resolverRef.current = resolve;

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
								message: request.message,
								type: request.type,
							};

							// Only add if not already present (check by message and type to avoid duplicates from discovery vs execution)
							if (!groupFields.some((f) => f.message === request.message && f.type === request.type)) {
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

					// Track phase groups (non-default behavior)
					if (request.flow === "phase") {
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

					if (!isPhaseGroup) {
						setGroupFieldHistory((prev) => {
							const newMap = new Map(prev);
							const groupFields =
								newMap.get(currentPrompt.groupName!) || [];
							const fieldInfo = {
								id: currentPrompt.id,
								message: currentPrompt.message,
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
							message: currentPrompt.message,
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
					? currentPrompt.message
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

	// Render completed root-level fields
	const renderCompletedRootFields = () => {
		// Only show root fields that come before the current prompt in the root order
		const currentPromptIndex = rootPromptOrder.findIndex(
			(p) => p.id === effectivePrompt?.id
		);
		const fieldsToShow =
			currentPromptIndex >= 0
				? rootPromptOrder.slice(0, currentPromptIndex)
				: rootPromptOrder;

		return fieldsToShow
			.filter(
				(entry) =>
					entry.type === "field" &&
					!entry.groupName &&
					completedFields.has(entry.id)
			)
			.map((entry) => {
				const fieldInfo = rootFieldHistory.find(
					(f) => f.id === entry.id
				);
				if (!fieldInfo) return null;

				const fieldValue = fieldValues[entry.id];

				if (fieldInfo.type === "text") {
					return (
						<TextField
							key={`completed-root-${entry.id}`}
							message={fieldInfo.message}
							completed={true}
							completedValue={fieldValue}
							onSubmit={() => {}}
							allowBack={false}
						/>
					);
				} else if (fieldInfo.type === "customText") {
					return (
						<CustomTextField
							key={`completed-root-${entry.id}`}
							message={fieldInfo.message}
							completed={true}
							completedValue={fieldValue}
							onSubmit={() => {}}
							allowBack={false}
						/>
					);
				} else if (fieldInfo.type === "validatedText") {
					return (
						<ValidatedTextField
							key={`completed-root-${entry.id}`}
							message={fieldInfo.message}
							completed={true}
							completedValue={fieldValue}
							onSubmit={() => {}}
							allowBack={false}
						/>
					);
				} else if (fieldInfo.type === "multi") {
					return (
						<MultiField
							key={`completed-root-${entry.id}`}
							message={fieldInfo.message}
							options={[]}
							completed={true}
							completedValue={fieldValue}
							onSubmit={() => {}}
							allowBack={false}
						/>
					);
				} else {
					return (
						<ConfirmField
							key={`completed-root-${entry.id}`}
							message={fieldInfo.message}
							completed={true}
							completedValue={fieldValue}
							onSubmit={() => {}}
							allowBack={false}
						/>
					);
				}
			})
			.filter(Boolean);
	};

	// Render completed groups at root level
	const renderCompletedGroups = () => {
		const currentGroupIndex = groupOrder.indexOf(currentGroup || "");

		return groupOrder
			.slice(0, currentGroupIndex >= 0 ? currentGroupIndex : 0)
			.filter((groupId) => completedGroups.has(groupId))
			.map((groupId) => {
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
			});
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
			// For static groups, render all fields (completed and future) at once
			return groupFields
				.map((field) => {
					// For static groups, find the stored value by matching message and type
					// since field IDs might differ between discovery and execution
					let fieldValue = fieldValues[field.id];
					let isCompleted = fieldValue !== undefined;

					// If not found by direct ID match, search by message and type
					if (!isCompleted) {
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
									isCompleted = true;
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

					if (field.type === "text") {
						// Use the fieldValue we already found (with fallback matching)
						const initialValue = fieldValue ?? "";

						return (
							<TextField
								key={`static-${field.message}-${field.type}`}
								message={field.message}
								initial={initialValue}
								completed={isCompleted && !isActive}
								completedValue={isCompleted ? fieldValue : undefined}
								disabled={!isActive && !isCompleted}
								onSubmit={isActive ? handleSubmit : () => {}}
								onBack={isActive ? handleBack : undefined}
								allowBack={isActive}
							/>
						);
					} else if (field.type === "customText") {
						const initialValue = fieldValue ?? "";
						// Get custom properties from effectivePrompt when this field is active
						const placeholder = (isActive && effectivePrompt?.type === "customText")
							? effectivePrompt.placeholder
							: undefined;
						const prefix = (isActive && effectivePrompt?.type === "customText")
							? effectivePrompt.prefix
							: undefined;

						return (
							<CustomTextField
								key={`static-${field.message}-${field.type}`}
								message={field.message}
								placeholder={placeholder}
								prefix={prefix}
								initial={initialValue}
								completed={isCompleted && !isActive}
								completedValue={isCompleted ? fieldValue : undefined}
								disabled={!isActive && !isCompleted}
								onSubmit={isActive ? handleSubmit : () => {}}
								onBack={isActive ? handleBack : undefined}
								allowBack={isActive}
							/>
						);
					} else if (field.type === "validatedText") {
						const initialValue = fieldValue ?? "";
						// Get validation properties from effectivePrompt when this field is active
						const validate = (isActive && effectivePrompt?.type === "validatedText")
							? effectivePrompt.validate
							: undefined;
						const transform = (isActive && effectivePrompt?.type === "validatedText")
							? effectivePrompt.transform
							: undefined;

						return (
							<ValidatedTextField
								key={`static-${field.message}-${field.type}`}
								message={field.message}
								validate={validate}
								transform={transform}
								initial={initialValue}
								completed={isCompleted && !isActive}
								completedValue={isCompleted ? fieldValue : undefined}
								disabled={!isActive && !isCompleted}
								onSubmit={isActive ? handleSubmit : () => {}}
								onBack={isActive ? handleBack : undefined}
								allowBack={isActive}
							/>
						);
					} else if (field.type === "multi") {
						// Get options from effectivePrompt when this field is active
						const options = (isActive && effectivePrompt?.type === "multi")
							? effectivePrompt.options || []
							: [];

						return (
							<MultiField
								key={`static-${field.message}-${field.type}`}
								message={field.message}
								options={options}
								completed={isCompleted && !isActive}
								completedValue={isCompleted ? fieldValue : undefined}
								disabled={!isActive && !isCompleted}
								onSubmit={isActive ? handleSubmit : () => {}}
								onBack={isActive ? handleBack : undefined}
								allowBack={isActive}
							/>
						);
					} else {
						// Use the fieldValue we already found (with fallback matching)
						const initialValue = fieldValue ?? false;

						return (
							<ConfirmField
								key={`static-${field.message}-${field.type}`}
								message={field.message}
								initial={initialValue}
								completed={isCompleted && !isActive}
								completedValue={isCompleted ? fieldValue : undefined}
								disabled={!isActive && !isCompleted}
								onSubmit={isActive ? handleSubmit : () => {}}
								onBack={isActive ? handleBack : undefined}
								allowBack={isActive}
							/>
						);
					}
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

					if (field.type === "text") {
						return (
							<TextField
								key={`completed-${field.id}`}
								message={field.message}
								completed={true}
								completedValue={fieldValue}
								onSubmit={() => {}}
								allowBack={false}
							/>
						);
					} else if (field.type === "customText") {
						return (
							<CustomTextField
								key={`completed-${field.id}`}
								message={field.message}
								completed={true}
								completedValue={fieldValue}
								onSubmit={() => {}}
								allowBack={false}
							/>
						);
					} else if (field.type === "validatedText") {
						return (
							<ValidatedTextField
								key={`completed-${field.id}`}
								message={field.message}
								completed={true}
								completedValue={fieldValue}
								onSubmit={() => {}}
								allowBack={false}
							/>
						);
					} else if (field.type === "multi") {
						return (
							<MultiField
								key={`completed-${field.id}`}
								message={field.message}
								options={[]}
								completed={true}
								completedValue={fieldValue}
								onSubmit={() => {}}
								allowBack={false}
							/>
						);
					} else {
						return (
							<ConfirmField
								key={`completed-${field.id}`}
								message={field.message}
								completed={true}
								completedValue={fieldValue}
								onSubmit={() => {}}
								allowBack={false}
							/>
						);
					}
				});
		}
	};

	if (!effectivePrompt) {
		// Keep a stable shell so layout doesn't jump, but show completed groups and fields
		return (
			<RootContainer>
				{renderCompletedRootFields()}
				{renderCompletedGroups()}
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
		switch (effectivePrompt.type) {
			case "text": {
				// In all groups (sequential by default), allow going back even on the first field if there are completed fields
				const isSequentialGroup = !!(
					effectivePrompt.groupName &&
					!phaseGroups.has(effectivePrompt.groupName)
				);
				const hasCompletedFields =
					isSequentialGroup && completedFields.size > 0;
				const allowBack =
					effectivePrompt.id !== firstFieldIdRef.current ||
					hasCompletedFields;

				const initialValue = visitedPrompts.has(effectivePrompt.id)
					? fieldValues[effectivePrompt.id] ?? effectivePrompt.initial
					: effectivePrompt.initial;

				field = (
					<TextField
						key={effectivePrompt.id}
						message={effectivePrompt.message}
						initial={initialValue}
						allowBack={allowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;
			}

			case "confirm": {
				// In all groups (sequential by default), allow going back even on the first field if there are completed fields
				const isSequentialGroup = !!(
					effectivePrompt.groupName &&
					!phaseGroups.has(effectivePrompt.groupName)
				);
				const hasCompletedFields =
					isSequentialGroup && completedFields.size > 0;
				const allowBack =
					effectivePrompt.id !== firstFieldIdRef.current ||
					hasCompletedFields;

				field = (
					<ConfirmField
						key={effectivePrompt.id}
						message={effectivePrompt.message}
						initial={
							visitedPrompts.has(effectivePrompt.id)
								? fieldValues[effectivePrompt.id] ??
								  effectivePrompt.initial
								: effectivePrompt.initial
						}
						allowBack={allowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;
			}

			case "customText": {
				const isSequentialGroup = !!(
					effectivePrompt.groupName &&
					!phaseGroups.has(effectivePrompt.groupName)
				);
				const hasCompletedFields =
					isSequentialGroup && completedFields.size > 0;
				const allowBack =
					effectivePrompt.id !== firstFieldIdRef.current ||
					hasCompletedFields;

				const initialValue = visitedPrompts.has(effectivePrompt.id)
					? fieldValues[effectivePrompt.id] ?? ""
					: "";

				field = (
					<CustomTextField
						key={effectivePrompt.id}
						message={effectivePrompt.message}
						placeholder={effectivePrompt.placeholder}
						prefix={effectivePrompt.prefix}
						initial={initialValue}
						allowBack={allowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;
			}

			case "validatedText": {
				const isSequentialGroup = !!(
					effectivePrompt.groupName &&
					!phaseGroups.has(effectivePrompt.groupName)
				);
				const hasCompletedFields =
					isSequentialGroup && completedFields.size > 0;
				const allowBack =
					effectivePrompt.id !== firstFieldIdRef.current ||
					hasCompletedFields;

				const initialValue = visitedPrompts.has(effectivePrompt.id)
					? fieldValues[effectivePrompt.id] ?? ""
					: "";

				field = (
					<ValidatedTextField
						key={effectivePrompt.id}
						message={effectivePrompt.message}
						validate={effectivePrompt.validate}
						transform={effectivePrompt.transform}
						initial={initialValue}
						allowBack={allowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;
			}

			case "multi": {
				const isSequentialGroup = !!(
					effectivePrompt.groupName &&
					!phaseGroups.has(effectivePrompt.groupName)
				);
				const hasCompletedFields =
					isSequentialGroup && completedFields.size > 0;
				const allowBack =
					effectivePrompt.id !== firstFieldIdRef.current ||
					hasCompletedFields;

				field = (
					<MultiField
						key={effectivePrompt.id}
						message={effectivePrompt.message}
						options={effectivePrompt.options || []}
						allowBack={allowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;
			}

			default:
				return (
					<GroupContainer groupName={getGroupDisplayName(currentGroup)}>{null}</GroupContainer>
				);
		}
	}

	return (
		<RootContainer>
			{renderCompletedRootFields()}
			{renderCompletedGroups()}
			<GroupContainer key="group-container" groupName={getGroupDisplayName(currentGroup)}>
				{renderCompletedFields()}
				{field}
			</GroupContainer>
		</RootContainer>
	);
}
