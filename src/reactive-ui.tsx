import React, { useState, useEffect, useRef, useCallback } from "react";
import { TextField } from "./prompts/text/TextField.js";
import { ConfirmField } from "./prompts/confirm/ConfirmField.js";
import { GroupContainer } from "./prompts/group/GroupContainer.js";
import { RootContainer } from "./prompts/shared/RootContainer.js";
import { CompletedGroup } from "./prompts/group/CompletedGroup.js";
import { globalRegistry } from "./registry.js";
import { FieldMetadata, DiscoveryDiff } from "./reactive-runtime.js";

// Enhanced prompt request types with reactive support
type ReactivePromptRequest =
	| {
			type: "text";
			id: string;
			message: string;
			initial?: string;
			groupName?: string;
			reactive?: boolean;
	  }
	| {
			type: "confirm";
			id: string;
			message: string;
			initial?: boolean;
			groupName?: string;
			reactive?: boolean;
	  }
	| {
			type: "customText";
			id: string;
			message: string;
			placeholder?: string;
			prefix?: string;
			groupName?: string;
			reactive?: boolean;
	  }
	| {
			type: "multi";
			id: string;
			message: string;
			options?: string[];
			groupName?: string;
			reactive?: boolean;
	  }
	| {
			type: "group";
			id: string;
			message?: string;
			flow?: "phase" | "static";
			reactive?: boolean;
			discoveredFields?: Array<{id: string, message: string, type: string}>;
	  };

interface ReactivePromptAppProps {
	onReady: (promptFn: (request: ReactivePromptRequest) => Promise<any>) => void;
}

// Field transition states
enum FieldTransitionState {
	ENTERING = 'entering',
	STABLE = 'stable',
	EXITING = 'exiting'
}

interface FieldTransitionData {
	field: FieldMetadata;
	state: FieldTransitionState;
	timestamp: number;
}

// Enhanced field renderer with animations
const AnimatedFieldRenderer: React.FC<{
	field: FieldMetadata;
	transitionState: FieldTransitionState;
	children: React.ReactNode;
}> = ({ field, transitionState, children }) => {
	const [isVisible, setIsVisible] = useState(transitionState === FieldTransitionState.STABLE);

	useEffect(() => {
		if (transitionState === FieldTransitionState.ENTERING) {
			// Start with hidden, then animate in
			setIsVisible(false);
			const timer = setTimeout(() => setIsVisible(true), 10);
			return () => clearTimeout(timer);
		} else if (transitionState === FieldTransitionState.EXITING) {
			// Animate out
			setIsVisible(false);
		} else {
			setIsVisible(true);
		}
	}, [transitionState]);

	const style: React.CSSProperties = {
		opacity: isVisible ? 1 : 0,
		transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
		transition: 'opacity 300ms ease-out, transform 300ms ease-out',
		marginBottom: transitionState === FieldTransitionState.EXITING ? 0 : undefined,
		maxHeight: transitionState === FieldTransitionState.EXITING ? 0 : undefined,
		overflow: transitionState === FieldTransitionState.EXITING ? 'hidden' : undefined
	};

	return (
		<div style={style} data-field-id={field.id} data-transition={transitionState}>
			{children}
		</div>
	);
};

// Loading skeleton for fields being discovered
const FieldSkeleton: React.FC<{ message: string }> = ({ message }) => (
	<div className="field-skeleton" style={{
		padding: '12px',
		backgroundColor: '#f5f5f5',
		borderRadius: '4px',
		marginBottom: '8px',
		animation: 'pulse 1.5s ease-in-out infinite'
	}}>
		<div style={{
			height: '16px',
			backgroundColor: '#e0e0e0',
			borderRadius: '2px',
			marginBottom: '8px',
			width: '60%'
		}} />
		<div style={{
			height: '32px',
			backgroundColor: '#e0e0e0',
			borderRadius: '2px',
			marginBottom: '4px'
		}} />
		<div style={{
			fontSize: '12px',
			color: '#666',
			fontStyle: 'italic'
		}}>
			Loading {message}...
		</div>
	</div>
);

export function ReactivePromptApp({ onReady }: ReactivePromptAppProps) {
	const [currentPrompt, setCurrentPrompt] = useState<ReactivePromptRequest | null>(null);
	const resolverRef = useRef<((value: any) => void) | null>(null);

	// Enhanced state for reactive functionality
	const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
	const [visitedPrompts, setVisitedPrompts] = useState<Set<string>>(new Set());
	const [currentGroup, setCurrentGroup] = useState<string | null>(null);
	const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
	const [phaseGroups, setPhaseGroups] = useState<Set<string>>(new Set());
	const [staticGroups, setStaticGroups] = useState<Set<string>>(new Set());
	const [reactiveGroups, setReactiveGroups] = useState<Set<string>>(new Set());

	// Field management state
	const [staticGroupFields, setStaticGroupFields] = useState<
		Map<string, Array<{ id: string; message: string; type: string }>>
	>(new Map());
	const [fieldTransitions, setFieldTransitions] = useState<
		Map<string, FieldTransitionData>
	>(new Map());
	const [pendingDiscovery, setPendingDiscovery] = useState<Set<string>>(new Set());

	// Group and field history
	const [groupFieldHistory, setGroupFieldHistory] = useState<
		Map<string, Array<{ id: string; message: string; type: string }>>
	>(new Map());
	const [completedGroups, setCompletedGroups] = useState<Set<string>>(new Set());
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
	const reactiveGroupsRef = useRef<Set<string>>(new Set());

	// Reactive field change handler
	const handleReactiveFieldChange = useCallback(async (
		fieldId: string,
		value: any,
		groupId: string
	) => {
		if (!reactiveGroupsRef.current.has(groupId)) return;

		// Add loading state for the group
		setPendingDiscovery(prev => new Set(prev).add(groupId));

		try {
			// Simulate reactive discovery delay
			await new Promise(resolve => setTimeout(resolve, 200));

			// For demo purposes, simulate discovering new fields when role becomes "admin"
			if (fieldId.includes('role') && value === 'admin') {
				const currentFields = staticGroupFields.get(groupId) || [];
				const hasAdminFields = currentFields.some(f =>
					f.message.toLowerCase().includes('access') ||
					f.message.toLowerCase().includes('email')
				);

				if (!hasAdminFields) {
					// Simulate discovering new fields
					const newFields = [
						...currentFields,
						{
							id: `admin-code-${Date.now()}`,
							message: "Access code",
							type: "text"
						},
						{
							id: `admin-email-${Date.now()}`,
							message: "Email",
							type: "text"
						}
					];

					// Add transition states for new fields
					const newTransitions = new Map(fieldTransitions);
					newFields.slice(currentFields.length).forEach(field => {
						newTransitions.set(field.id, {
							field: field as FieldMetadata,
							state: FieldTransitionState.ENTERING,
							timestamp: Date.now()
						});
					});

					setFieldTransitions(newTransitions);
					setStaticGroupFields(prev => new Map(prev).set(groupId, newFields));

					// After animation, set fields to stable state
					setTimeout(() => {
						setFieldTransitions(prev => {
							const updated = new Map(prev);
							newFields.forEach(field => {
								const transition = updated.get(field.id);
								if (transition?.state === FieldTransitionState.ENTERING) {
									updated.set(field.id, {
										...transition,
										state: FieldTransitionState.STABLE
									});
								}
							});
							return updated;
						});
					}, 300);
				}
			}

		} finally {
			// Remove loading state
			setPendingDiscovery(prev => {
				const updated = new Set(prev);
				updated.delete(groupId);
				return updated;
			});
		}
	}, [fieldTransitions, staticGroupFields]);

	// Helper function to get display name for a group
	const getGroupDisplayName = (groupId: string | null): string | null => {
		if (!groupId) return null;
		return groupIdToMessage.get(groupId) || null;
	};

	// Enhanced field component renderer with reactive support
	const renderFieldComponent = (
		fieldInfo: { id: string; message: string; type: string },
		props: any
	) => {
		const { key: propsKey, ...restProps } = props;
		const key = propsKey || `field-${fieldInfo.id}`;

		// Get transition state
		const transition = fieldTransitions.get(fieldInfo.id);
		const transitionState = transition?.state || FieldTransitionState.STABLE;

		// Check for plugin components first
		const PluginComponent = globalRegistry.getComponent(fieldInfo.type);
		let fieldComponent: React.ReactNode;

		if (PluginComponent) {
			fieldComponent = (
				<PluginComponent
					key={key}
					message={fieldInfo.message}
					{...restProps}
				/>
			);
		} else if (fieldInfo.type === "text") {
			fieldComponent = (
				<TextField
					key={key}
					message={fieldInfo.message}
					{...restProps}
				/>
			);
		} else {
			fieldComponent = (
				<ConfirmField
					key={key}
					message={fieldInfo.message}
					{...restProps}
				/>
			);
		}

		// Wrap with animation if transitioning
		if (transitionState !== FieldTransitionState.STABLE) {
			return (
				<AnimatedFieldRenderer
					field={fieldInfo as FieldMetadata}
					transitionState={transitionState}
				>
					{fieldComponent}
				</AnimatedFieldRenderer>
			);
		}

		return fieldComponent;
	};

	// Initialize prompt function
	useEffect(() => {
		const promptFn = (request: ReactivePromptRequest): Promise<any> => {
			return new Promise((resolve) => {
				if (
					request.type !== "group" &&
					firstFieldIdRef.current === null
				) {
					firstFieldIdRef.current = request.id;
				}
				setCurrentPrompt(request);
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

					// For reactive static groups, setup field change monitoring
					if (request.groupName && reactiveGroupsRef.current.has(request.groupName)) {
						// Track fields for reactive discovery
						setStaticGroupFields((prev) => {
							const newMap = new Map(prev);
							const groupFields = newMap.get(request.groupName!) || [];
							const fieldInfo = {
								id: request.id,
								message: request.message,
								type: request.type,
							};

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
							groupName: request.id,
						};
						if (!prev.some((p) => p.id === request.id)) {
							return [...prev, entry];
						}
						return prev;
					});

					// Track group information
					setGroupIdToMessage((prev) => {
						const newMap = new Map(prev);
						newMap.set(request.id, request.message);
						return newMap;
					});

					setGroupOrder((prev) => {
						if (!prev.includes(request.id)) {
							return [...prev, request.id];
						}
						return prev;
					});
				}

				// Update current group
				if (request.type !== "group") {
					setCurrentGroup(request.groupName || null);
				} else if (request.type === "group") {
					setCurrentGroup(request.id);

					// Track different group types
					if (request.flow === "phase") {
						setPhaseGroups((prev) => new Set(prev).add(request.id));
					}

					if (request.flow === "static") {
						staticGroupsRef.current.add(request.id);
						setStaticGroups((prev) => new Set(prev).add(request.id));

						// Check if this is a reactive group
						if (request.reactive) {
							reactiveGroupsRef.current.add(request.id);
							setReactiveGroups((prev) => new Set(prev).add(request.id));
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

	// Enhanced submit handler with reactive support
	const handleSubmit = (value: any) => {
		if (resolverRef.current && currentPrompt) {
			if (currentPrompt.type !== "group") {
				setFieldValues((prev) => ({
					...prev,
					[currentPrompt.id]: value,
				}));
				setVisitedPrompts((prev) => new Set(prev).add(currentPrompt.id));
				setCompletedFields((prev) => new Set(prev).add(currentPrompt.id));

				if (currentPrompt.groupName) {
					const isPhaseGroup = phaseGroups.has(currentPrompt.groupName);
					const isStaticGroup = staticGroups.has(currentPrompt.groupName);
					const isReactiveGroup = reactiveGroups.has(currentPrompt.groupName);

					// Handle reactive field changes
					if (isReactiveGroup) {
						handleReactiveFieldChange(
							currentPrompt.id,
							value,
							currentPrompt.groupName
						);
					}

					// Standard field tracking for static groups
					if (isStaticGroup) {
						setStaticGroupFields((prev) => {
							const newMap = new Map(prev);
							const groupFields = newMap.get(currentPrompt.groupName!) || [];
							const fieldInfo = {
								id: currentPrompt.id,
								message: currentPrompt.message,
								type: currentPrompt.type,
							};

							if (!groupFields.some((f) => f.message === fieldInfo.message && f.type === fieldInfo.type)) {
								newMap.set(currentPrompt.groupName!, [...groupFields, fieldInfo]);
							}
							return newMap;
						});
					}

					// Track in group history for non-phase groups
					if (!isPhaseGroup) {
						setGroupFieldHistory((prev) => {
							const newMap = new Map(prev);
							const groupFields = newMap.get(currentPrompt.groupName!) || [];
							const fieldInfo = {
								id: currentPrompt.id,
								message: currentPrompt.message,
								type: currentPrompt.type,
							};

							if (!groupFields.some((f) => f.id === currentPrompt.id)) {
								newMap.set(currentPrompt.groupName!, [...groupFields, fieldInfo]);
							}
							return newMap;
						});
					}
				} else {
					// Track root-level fields
					setRootFieldHistory((prev) => {
						const fieldInfo = {
							id: currentPrompt.id,
							message: currentPrompt.message,
							type: currentPrompt.type,
						};

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
	};

	// Back handler (preserved from original)
	const handleBack = () => {
		if (resolverRef.current && currentPrompt) {
			const toMaybeDelete = currentPrompt.id;
			const r = resolverRef.current;
			resolverRef.current = null;

			r({ __back: true });

			// Cleanup state
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

			setFieldValues((prev) => {
				if (!(toMaybeDelete in prev)) return prev;
				const next = { ...prev };
				delete next[toMaybeDelete];
				return next;
			});

			// Group completion cleanup
			const currentPromptGroup =
				currentPrompt.type === "group"
					? currentPrompt.id
					: currentPrompt.groupName;

			if (currentPromptGroup) {
				const currentGroupIndex = groupOrder.indexOf(currentPromptGroup);
				setCompletedGroups((prev) => {
					const next = new Set(prev);

					if (next.has(currentPromptGroup)) {
						next.delete(currentPromptGroup);
					}

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

	// Enhanced field rendering with reactive support
	const renderReactiveFields = () => {
		if (!currentGroup || phaseGroups.has(currentGroup)) {
			return null;
		}

		const isStaticGroup = staticGroups.has(currentGroup);
		const isReactiveGroup = reactiveGroups.has(currentGroup);

		if (!isStaticGroup) return null;

		const groupFields = staticGroupFields.get(currentGroup) || [];
		const executedFields = groupFieldHistory.get(currentGroup) || [];
		const effectivePrompt = currentPrompt?.type !== "group" ? currentPrompt : null;

		// Show loading skeleton if discovery is pending
		if (pendingDiscovery.has(currentGroup)) {
			return (
				<div>
					{groupFields.map(field => renderFieldComponent(field, {
						key: `field-${field.id}`,
						initial: fieldValues[field.id] ?? (field.type === 'confirm' ? false : ""),
						completed: completedFields.has(field.id),
						completedValue: fieldValues[field.id],
						disabled: !effectivePrompt || field.id !== effectivePrompt.id,
						onSubmit: effectivePrompt?.id === field.id ? handleSubmit : () => {},
						onBack: effectivePrompt?.id === field.id ? handleBack : undefined,
						allowBack: effectivePrompt?.id === field.id
					}))}
					<FieldSkeleton message="new fields" />
				</div>
			);
		}

		// Create unified field list
		const allFields = new Map();

		// Add discovered fields first
		groupFields.forEach(field => {
			allFields.set(field.message + '|' + field.type, field);
		});

		// Add executed fields (they take precedence)
		executedFields.forEach(field => {
			allFields.set(field.message + '|' + field.type, field);
		});

		return Array.from(allFields.values()).map((field) => {
			let fieldValue = fieldValues[field.id];
			let isCompleted = fieldValue !== undefined;

			// Find field value by matching message/type if direct ID doesn't work
			if (!isCompleted) {
				for (const [storedId, storedValue] of Object.entries(fieldValues)) {
					const matchingEntry = rootPromptOrder.find(entry =>
						entry.id === storedId && entry.groupName === currentGroup
					);
					if (matchingEntry) {
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

			const isActive = effectivePrompt ?
				(field.id === effectivePrompt.id ||
				 (field.message === effectivePrompt.message && field.type === effectivePrompt.type))
				: false;

			const getInitialValue = () => {
				if (field.type === 'multi') {
					return isCompleted ? fieldValue || [] : [];
				}
				return fieldValue ?? (field.type === 'confirm' ? false : "");
			};

			// Get type-specific properties
			const typeSpecificProps: any = {};
			if (isActive && effectivePrompt) {
				if (field.type === "customText" && effectivePrompt.type === "customText") {
					typeSpecificProps.placeholder = effectivePrompt.placeholder;
					typeSpecificProps.prefix = effectivePrompt.prefix;
				} else if (field.type === "multi" && effectivePrompt.type === "multi") {
					typeSpecificProps.options = effectivePrompt.options || [];
				}
			}

			if (field.type === "multi" && !typeSpecificProps.options) {
				typeSpecificProps.options = [];
			}

			return renderFieldComponent(field, {
				key: `reactive-${field.message}-${field.type}`,
				initial: getInitialValue(),
				completed: isCompleted && !isActive,
				completedValue: isCompleted ? fieldValue : undefined,
				disabled: !isActive && !isCompleted,
				onSubmit: isActive ? handleSubmit : () => {},
				onBack: isActive ? handleBack : undefined,
				allowBack: isActive,
				...typeSpecificProps
			});
		});
	};

	// Track group transitions for completion detection
	const previousGroupRef = useRef<string | null>(null);

	useEffect(() => {
		const prevGroup = previousGroupRef.current;

		if (prevGroup && currentGroup && prevGroup !== currentGroup) {
			const prevGroupIndex = groupOrder.indexOf(prevGroup);
			let currentGroupIndex = groupOrder.indexOf(currentGroup);

			let effectiveCurrentGroupIndex = currentGroupIndex;
			if (currentGroupIndex === -1) {
				effectiveCurrentGroupIndex = groupOrder.length;

				setGroupOrder((prev) => {
					if (!prev.includes(currentGroup)) {
						return [...prev, currentGroup];
					}
					return prev;
				});
			}

			if (
				prevGroupIndex >= 0 &&
				effectiveCurrentGroupIndex >= 0 &&
				effectiveCurrentGroupIndex > prevGroupIndex
			) {
				setCompletedGroups((prev) => new Set(prev).add(prevGroup));
			}
		}

		if (prevGroup && !currentGroup) {
			setCompletedGroups((prev) => new Set(prev).add(prevGroup));
		}

		previousGroupRef.current = currentGroup;
	}, [currentGroup, groupOrder]);

	// Auto-resolve group prompts
	useEffect(() => {
		if (currentPrompt?.type === "group" && resolverRef.current) {
			const r = resolverRef.current;
			resolverRef.current = null;
			r(undefined);
		}
	}, [currentPrompt]);

	// Render completed items in execution order (preserved from original)
	const renderCompletedItemsInOrder = () => {
		const effectivePrompt = currentPrompt?.type === "group" ? null : currentPrompt;
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
					const fieldInfo = rootFieldHistory.find((f) => f.id === entry.id);
					if (!fieldInfo) return null;

					const fieldValue = fieldValues[entry.id];

					return renderFieldComponent(fieldInfo, {
						key: `completed-root-${entry.id}`,
						completed: true,
						completedValue: fieldValue,
						onSubmit: () => {},
						allowBack: false,
						...(fieldInfo.type === 'multi' ? { options: [], initial: [] } : {})
					});
				} else if (entry.type === "group" && completedGroups.has(entry.id) && entry.id !== currentGroup) {
					const groupId = entry.id;
					const groupDisplayName = getGroupDisplayName(groupId);

					if (phaseGroups.has(groupId)) {
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
						const groupFields = groupFieldHistory.get(groupId) || [];
						const completedGroupFields = groupFields
							.filter((field) => {
								const belongsToGroup =
									rootPromptOrder.find((p) => p.id === field.id)?.groupName === groupId;
								return completedFields.has(field.id) && belongsToGroup;
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
								groupName={groupDisplayName}
								completedFields={completedGroupFields}
							/>
						);
					}
				}
				return null;
			})
			.filter(Boolean);
	};

	// Main render
	const effectivePrompt = currentPrompt?.type === "group" ? null : currentPrompt;

	if (!effectivePrompt) {
		return (
			<RootContainer>
				{renderCompletedItemsInOrder()}
				<GroupContainer groupName={getGroupDisplayName(currentGroup)}>
					{renderReactiveFields()}
				</GroupContainer>
			</RootContainer>
		);
	}

	// Check if current field is part of reactive static group rendering
	const isCurrentGroupReactive = currentGroup && reactiveGroups.has(currentGroup);
	let field: React.ReactNode = null;

	if (!isCurrentGroupReactive) {
		// Standard field rendering for non-reactive groups
		switch (effectivePrompt.type) {
			case "text": {
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

			default: {
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

					const getInitialValue = () => {
						if (!visitedPrompts.has(effectivePrompt.id)) {
							return effectivePrompt.type === 'multi' ? [] : "";
						}
						const storedValue = fieldValues[effectivePrompt.id];
						return storedValue ?? (effectivePrompt.type === 'multi' ? [] : "");
					};

					field = (
						<PluginComponent
							key={effectivePrompt.id}
							{...effectivePrompt}
							initial={getInitialValue()}
							allowBack={allowBack}
							onSubmit={handleSubmit}
							onBack={handleBack}
						/>
					);
					break;
				}

				return (
					<GroupContainer groupName={getGroupDisplayName(currentGroup)}>{null}</GroupContainer>
				);
			}
		}
	}

	return (
		<RootContainer>
			{renderCompletedItemsInOrder()}
			<GroupContainer key="group-container" groupName={getGroupDisplayName(currentGroup)}>
				{renderReactiveFields()}
				{field}
			</GroupContainer>
		</RootContainer>
	);
}