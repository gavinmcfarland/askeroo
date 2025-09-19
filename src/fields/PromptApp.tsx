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
	| { type: "group"; id: string; message: string };

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

				// Only update currentGroup for actual fields, not group prompts
				// Group prompts are processed for flow control but shouldn't affect UI
				if (request.type !== "group" && request.groupName) {
					setCurrentGroup(request.groupName);
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
			}
			const r = resolverRef.current;
			resolverRef.current = null;
			// resolve immediately; let the controller switch the prompt
			r(value);
		}
	};

	const handleBack = () => {
		if (resolverRef.current && currentPrompt) {
			// ⬇️ Defer cleanup so there’s no intermediate frame before the controller
			// installs the previous prompt. This avoids the flicker.
			const toMaybeDelete = currentPrompt.id;

			const r = resolverRef.current;
			resolverRef.current = null;

			// Resolve first (previous prompt will be pushed synchronously/soon).
			r({ __back: true });

			// Cleanup visited prompts on the next tick so it batches with the new prompt render.
			queueMicrotask(() => {
				setVisitedPrompts((prev) => {
					if (!prev.has(toMaybeDelete)) return prev;
					const next = new Set(prev);
					next.delete(toMaybeDelete);
					return next;
				});
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

	if (!effectivePrompt) {
		// Keep a stable shell so layout doesn't jump
		return <GroupContainer groupName={currentGroup}>{null}</GroupContainer>;
	}

	let field: React.ReactNode;

	switch (effectivePrompt.type) {
		case "text": {
			const allowBack = effectivePrompt.id !== firstFieldIdRef.current;
			field = (
				<TextField
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

		case "confirm": {
			const allowBack = effectivePrompt.id !== firstFieldIdRef.current;
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
			{field}
		</GroupContainer>
	);
}
