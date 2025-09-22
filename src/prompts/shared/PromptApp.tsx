import React, { useState, useEffect, useRef } from "react";
import { TextField } from "../text/TextField.js";
import { ConfirmField } from "../confirm/ConfirmField.js";
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
	| { type: "group"; id: string; message?: string; flow?: "phase" };

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
					// For grouped fields, track in group history (unless it's a phase group)
					// Double-check that this field actually belongs to a group
					if (!phaseGroups.has(currentPrompt.groupName)) {
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
					return (
						<CompletedGroup
							key={`completed-group-${groupId}`}
							groupName={groupDisplayName || "Completed"}
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
							groupName={groupDisplayName || "Group"}
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

		const groupFields = groupFieldHistory.get(currentGroup) || [];
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

	let field: React.ReactNode;

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

		default:
			return (
				<GroupContainer groupName={getGroupDisplayName(currentGroup)}>{null}</GroupContainer>
			);
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
