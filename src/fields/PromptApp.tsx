import React, { useState, useEffect, useRef } from "react";
import { TextField } from "./TextField.js";
import { ConfirmField } from "./ConfirmField.js";
import { GroupContainer } from "./GroupContainer.js";

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
	| { type: "group"; id: string; message: string; flow?: 'stack' };

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
	const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
	const [stackGroups, setStackGroups] = useState<Set<string>>(new Set());
	const [groupFieldHistory, setGroupFieldHistory] = useState<Map<string, Array<{id: string, message: string, type: string}>>>(new Map());
	const firstFieldIdRef = useRef<string | null>(null);

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

				// Update currentGroup based on the request
				if (request.type !== "group") {
					// Field prompts always update the group (most accurate)
					setCurrentGroup(request.groupName || null);
				} else if (request.type === "group") {
					// Group prompts update the group (needed for initial display and cross-group nav)
					setCurrentGroup(request.message);

					// Track stack groups (non-default behavior)
					if (request.flow === 'stack') {
						setStackGroups(prev => new Set(prev).add(request.message));
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

				// For all groups (sequential by default), mark the field as completed unless it's a stack group
				if (currentPrompt.groupName && !stackGroups.has(currentPrompt.groupName)) {
					setCompletedFields(prev => new Set(prev).add(currentPrompt.id));

					// Track field order in the group
					setGroupFieldHistory(prev => {
						const newMap = new Map(prev);
						const groupFields = newMap.get(currentPrompt.groupName!) || [];
						const fieldInfo = {
							id: currentPrompt.id,
							message: currentPrompt.message,
							type: currentPrompt.type
						};
						if (!groupFields.some(f => f.id === currentPrompt.id)) {
							newMap.set(currentPrompt.groupName!, [...groupFields, fieldInfo]);
						}
						return newMap;
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
		}
	};

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

	// Render completed fields for all groups (sequential by default)
	const renderCompletedFields = () => {
		if (!currentGroup || stackGroups.has(currentGroup)) {
			return null;
		}

		const groupFields = groupFieldHistory.get(currentGroup) || [];
		return groupFields
			.filter(field => completedFields.has(field.id) && field.id !== effectivePrompt?.id)
			.map(field => {
				const fieldValue = fieldValues[field.id];

				if (field.type === 'text') {
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
		// Keep a stable shell so layout doesn't jump, but show completed fields
		return (
			<GroupContainer groupName={currentGroup}>
				{renderCompletedFields()}
			</GroupContainer>
		);
	}

	let field: React.ReactNode;

	switch (effectivePrompt.type) {
		case "text": {
			// In all groups (sequential by default), allow going back even on the first field if there are completed fields
			const isSequentialGroup = !!(effectivePrompt.groupName && !stackGroups.has(effectivePrompt.groupName));
			const hasCompletedFields = isSequentialGroup && completedFields.size > 0;
			const allowBack = effectivePrompt.id !== firstFieldIdRef.current || hasCompletedFields;

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
			const isSequentialGroup = !!(effectivePrompt.groupName && !stackGroups.has(effectivePrompt.groupName));
			const hasCompletedFields = isSequentialGroup && completedFields.size > 0;
			const allowBack = effectivePrompt.id !== firstFieldIdRef.current || hasCompletedFields;

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
				<GroupContainer groupName={currentGroup}>{null}</GroupContainer>
			);
	}

	return (
		<GroupContainer key="group-container" groupName={currentGroup}>
			{renderCompletedFields()}
			{field}
		</GroupContainer>
	);
}
