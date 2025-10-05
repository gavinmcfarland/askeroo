import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { createPlugin } from "../../core/registry.js";
import { ValidatorFunction } from "../../types/index.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";

export interface TextOptions {
	label: string;
	shortLabel?: string;
	initialValue?: string;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<string>;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Core text input plugin
export const text = createPlugin<TextOptions, string>({
	type: "text",
	interactive: true,

	render: () =>
		function TextField({
			label,
			shortLabel,
			initialValue = "",
			allowBack = true,
			state = "active",
			completedValue,
			flow,
			isFirstInGroup = false,
			isLastInGroup = false,
			enableArrowNavigation = false,
			isFirstRootPrompt = false,
			onSubmit,
			onBack,
			onHintChange,
			onValidate,
		}: any) {
			const [value, setValue] = useState(initialValue);
			const [cursorPosition, setCursorPosition] = useState(
				initialValue.length
			);
			const [submitted, setSubmitted] = useState(false);
			const [validationError, setValidationError] = useState<
				string | null
			>(null);

			// Reset state when field becomes active
			const disabled = state === "disabled";
			useFieldReset(disabled, submitted, setSubmitted);

			useEffect(() => {
				if (!disabled) {
					setValue(initialValue);
					setCursorPosition(initialValue.length);
				}
			}, [initialValue, disabled]);

			// Validation helper
			const runValidation = async (val: string): Promise<boolean> => {
				if (!onValidate || state !== "active") {
					setValidationError(null);
					return true;
				}
				try {
					const result = await onValidate(val);
					setValidationError(result);
					return result === null;
				} catch {
					setValidationError("Validation error occurred");
					return false;
				}
			};

			// Hint management
			useEffect(() => {
				if (!onHintChange) return;
				onHintChange(
					state === "active" && !isFirstRootPrompt && allowBack ? (
						<>
							<Text color="yellow">escape</Text> go back
						</>
					) : null
				);
			}, [state, isFirstRootPrompt, allowBack, onHintChange]);

			useInput(
				async (input, key) => {
					if (submitted || state !== "active") return;

					// Keyboard shortcuts
					if (
						(key.ctrl && input === "u") ||
						(key.meta && input === "k")
					) {
						setValue("");
						setCursorPosition(0);
						return;
					}
					if (key.ctrl && input === "a") {
						setCursorPosition(0);
						return;
					}
					if (key.ctrl && input === "e") {
						setCursorPosition(value.length);
						return;
					}

					// Cursor movement (not in static group arrow nav mode)
					if (!(flow === "static" && enableArrowNavigation)) {
						if (key.leftArrow) {
							setCursorPosition(Math.max(0, cursorPosition - 1));
							return;
						}
						if (key.rightArrow) {
							setCursorPosition(
								Math.min(value.length, cursorPosition + 1)
							);
							return;
						}
					}

					// Static group navigation
					if (flow === "static" && enableArrowNavigation) {
						if (key.downArrow && !isLastInGroup) {
							if (!(await runValidation(value))) return;
							setSubmitted(true);
							onSubmit(value);
							return;
						}
						if (key.upArrow && !isFirstInGroup) {
							if (!(await runValidation(value))) return;
							setSubmitted(true);
							onSubmit({ __preserveAndBack: true, value });
							return;
						}
						if (key.downArrow || key.upArrow) return;
					}

					// Escape handling
					if (flow === "static" && key.escape) {
						if (enableArrowNavigation && !isFirstInGroup) {
							if (!(await runValidation(value))) return;
							setSubmitted(true);
							onSubmit({ __preserveAndBack: true, value });
						} else if (enableArrowNavigation && isFirstInGroup) {
							setSubmitted(true);
							onSubmit({ __clearGroupAndBack: true });
						} else if (allowBack && onBack) {
							onBack();
						}
						return;
					}

					if (key.return) {
						if (!(await runValidation(value))) return;
						setSubmitted(true);
						onSubmit(value);
					} else if (key.backspace || key.delete) {
						if (cursorPosition > 0) {
							setValue(
								value.slice(0, cursorPosition - 1) +
									value.slice(cursorPosition)
							);
							setCursorPosition(cursorPosition - 1);
						}
					} else if (
						key.escape &&
						flow !== "static" &&
						allowBack &&
						onBack
					) {
						onBack();
					} else if (!key.ctrl && !key.meta && input) {
						setValue(
							value.slice(0, cursorPosition) +
								input +
								value.slice(cursorPosition)
						);
						setCursorPosition(cursorPosition + 1);
					}
				},
				{ isActive: state === "active" && !submitted }
			);

			if (state === "completed") {
				return (
					<Box flexDirection="column">
						<Text>{label}</Text>
						<Text color="blue">{completedValue || value}</Text>
					</Box>
				);
			}

			if (state === "disabled") {
				return (
					<Box gap={1}>
						<Box width={14}>
							<Text dimColor>{shortLabel || label}</Text>
						</Box>
						<Text dimColor color="gray">
							...
						</Text>
					</Box>
				);
			}

			return (
				<Box flexDirection="column">
					<Box
						flexDirection={flow === "static" ? "row" : "column"}
						gap={flow === "static" ? 1 : 0}
						marginBottom={
							flow === "static" && !isLastInGroup ? 1 : 0
						}
					>
						<Box width={flow === "static" ? 14 : undefined}>
							<Text>{label}</Text>
						</Box>
						<Text color="cyan">
							{value.slice(0, cursorPosition)}
							{cursorPosition < value.length && (
								<Text backgroundColor="grey" color="black">
									{value[cursorPosition]}
								</Text>
							)}
							{cursorPosition >= value.length && (
								<Text backgroundColor="grey" color="black">
									{" "}
								</Text>
							)}
							{value.slice(
								cursorPosition +
									(cursorPosition < value.length ? 1 : 0)
							)}
							{value.length === 0 &&
								cursorPosition === 0 &&
								"\u200B"}
						</Text>
					</Box>
					{validationError && (
						<Box>
							<Text color="red">{validationError}</Text>
						</Box>
					)}
				</Box>
			);
		},
});
