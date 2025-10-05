import { useState, useEffect } from "react";
import { useFieldReset } from "../../hooks/use-auto-submit.js";
import { Text, Box, useInput } from "ink";
import { ValidatorFunction, PluginState } from "../../types/index.js";

interface Props {
	label?: string;
	message?: string; // Alternative to label for compatibility
	shortLabel?: string;
	onSubmit: (
		value:
			| string
			| { __preserveAndBack: boolean; value: string }
			| { __clearGroupAndBack: boolean }
	) => void;
	onBack?: () => void;
	initialValue?: string;
	allowBack?: boolean;
	state?: PluginState;
	completedValue?: string;
	flow?: "progressive" | "phased" | "static";
	onNavigate?: (direction: "up" | "down") => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
	onValidate?: ValidatorFunction<string>;
}

export function TextField({
	label,
	message,
	shortLabel,
	onSubmit,
	onBack,
	initialValue = "",
	allowBack = true,
	state = "active",
	completedValue,
	flow,
	onNavigate,
	isFirstInGroup = false,
	isLastInGroup = false,
	enableArrowNavigation = false,
	onHintChange,
	isFirstRootPrompt = false,
	onValidate,
}: Props) {
	// Use label if provided, fallback to message for compatibility
	const [value, setValue] = useState(initialValue);
	const [cursorPosition, setCursorPosition] = useState(initialValue.length);
	const [submitted, setSubmitted] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

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
			if ((key.ctrl && input === "u") || (key.meta && input === "k")) {
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
			} else if (key.escape && flow !== "static" && allowBack && onBack) {
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
				marginBottom={flow === "static" && !isLastInGroup ? 1 : 0}
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
						cursorPosition + (cursorPosition < value.length ? 1 : 0)
					)}
					{value.length === 0 && cursorPosition === 0 && "\u200B"}
				</Text>
			</Box>
			{validationError && (
				<Box>
					<Text color="red">{validationError}</Text>
				</Box>
			)}
		</Box>
	);
}
