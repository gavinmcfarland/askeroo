import React, { useState, useEffect, useRef } from "react";
import { TextField } from "./TextField.js";
import { ConfirmField } from "./ConfirmField.js";
import { GroupContainer } from "./GroupContainer.js";

type BackToken = { __back: true };

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
	const [resolvePrompt, setResolvePrompt] = useState<
		((value: any) => void) | null
	>(null);
	const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
	const [visitedPrompts, setVisitedPrompts] = useState<Set<string>>(
		new Set()
	);
	const [currentGroup, setCurrentGroup] = useState<string | null>(null);
	const firstFieldIdRef = useRef<string | null>(null);

	useEffect(() => {
		const promptFn = (request: PromptRequest): Promise<any> => {
			return new Promise((resolve) => {
				// Track the first interactive field (only set once per app lifecycle)
				if (
					request.type !== "group" &&
					firstFieldIdRef.current === null
				) {
					firstFieldIdRef.current = request.id;
				}

				setCurrentPrompt(request);
				setResolvePrompt(() => resolve);

				// Update current group state - only set, don't clear within groups
				if (request.type === "group") {
					setCurrentGroup(request.message);
				} else if (request.groupName) {
					setCurrentGroup(request.groupName);
				}
				// Don't automatically clear currentGroup - let it persist within the group
			});
		};

		onReady(promptFn);
	}, [onReady]);

	const isBackToken = (value: any): value is BackToken => {
		return (
			typeof value === "object" && value !== null && value.__back === true
		);
	};

	const handleSubmit = (value: any) => {
		if (resolvePrompt && currentPrompt) {
			// Store the actual value
			if (currentPrompt.type !== "group") {
				setFieldValues((prev) => ({
					...prev,
					[currentPrompt.id]: value,
				}));
				// Mark this prompt as visited when we store a value
				setVisitedPrompts((prev) =>
					new Set(prev).add(currentPrompt.id)
				);
			}

			resolvePrompt(value);
			setResolvePrompt(null);
		}
	};

	const handleBack = () => {
		if (resolvePrompt && currentPrompt) {
			// Clean up visited prompts that are no longer reachable
			// Only update visited prompts if this prompt was actually visited before
			console.log("handleBack", visitedPrompts);
			if (visitedPrompts.has(currentPrompt.id)) {
				setVisitedPrompts((prev) => {
					const newVisited = new Set(prev);
					newVisited.delete(currentPrompt.id);
					return newVisited;
				});
			}

			resolvePrompt({ __back: true });
			setResolvePrompt(null);
		}
	};

	// Auto-resolve group prompts since they don't need user input
	useEffect(() => {
		if (currentPrompt?.type === "group" && resolvePrompt) {
			resolvePrompt(undefined);
			setResolvePrompt(null);
			// Don't clear currentPrompt immediately - let the next prompt replace it
		}
	}, [currentPrompt, resolvePrompt]);

	if (!currentPrompt) {
		return null;
	}

	const renderField = () => {
		if (!currentPrompt) return null;

		let field: React.ReactNode;

		switch (currentPrompt.type) {
			case "text":
				const textAllowBack =
					currentPrompt.id !== firstFieldIdRef.current;
				field = (
					<TextField
						key={currentPrompt.id}
						message={currentPrompt.message}
						initial={
							visitedPrompts.has(currentPrompt.id)
								? fieldValues[currentPrompt.id] ??
								  currentPrompt.initial
								: currentPrompt.initial
						}
						allowBack={textAllowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;

			case "confirm":
				const confirmAllowBack =
					currentPrompt.id !== firstFieldIdRef.current;
				field = (
					<ConfirmField
						key={currentPrompt.id}
						message={currentPrompt.message}
						initial={
							visitedPrompts.has(currentPrompt.id)
								? fieldValues[currentPrompt.id] ??
								  currentPrompt.initial
								: currentPrompt.initial
						}
						allowBack={confirmAllowBack}
						onSubmit={handleSubmit}
						onBack={handleBack}
					/>
				);
				break;

			case "group":
				// Group headers are now handled by GroupContainer wrapping fields
				// Render a placeholder that will be wrapped by GroupContainer
				field = <React.Fragment key={currentPrompt.id} />;
				break;

			default:
				return null;
		}

		// Always wrap in GroupContainer for consistent rendering
		return (
			<GroupContainer key="group-container" groupName={currentGroup}>
				{field}
			</GroupContainer>
		);
	};

	return renderField();
}
