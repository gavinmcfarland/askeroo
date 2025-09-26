import { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

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
	completed?: boolean;
	completedValue?: string;
	disabled?: boolean;
	flow?: "progressive" | "phased" | "static";
	onNavigate?: (direction: "up" | "down") => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
}

export function TextField({
	label,
	message,
	shortLabel,
	onSubmit,
	onBack,
	initialValue = "",
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
	flow,
	onNavigate,
	isFirstInGroup = false,
	isLastInGroup = false,
	enableArrowNavigation = false,
	onHintChange,
	isFirstRootPrompt = false,
}: Props) {
	// Use label if provided, fallback to message for compatibility
	const displayLabel = label || message || "Enter text";
	const [value, setValue] = useState(initialValue);
	const [cursorPosition, setCursorPosition] = useState(initialValue.length);
	const [submitted, setSubmitted] = useState(false);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Separately handle value restoration when initialValue changes
	useEffect(() => {
		// Always restore the initialValue when the field becomes active (not disabled)
		// This ensures preserved values are restored when navigating back to fields
		if (!disabled) {
			setValue(initialValue);
			setCursorPosition(initialValue.length);
		}
	}, [initialValue, disabled]);

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			const hintText = (
				<>
					<Text color="yellow">&lt;enter&gt;</Text> proceed
					{!isFirstRootPrompt && (
						<>
							, <Text color="yellow">&lt;escape&gt;</Text> go back
						</>
					)}
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [disabled, completed, flow, isFirstRootPrompt]); // Removed onHintChange from dependencies

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		// Handle Ctrl+U or Cmd+K to clear entire input (common terminal shortcuts)
		if ((key.ctrl && input === "u") || (key.meta && input === "k")) {
			setValue("");
			setCursorPosition(0);
			return;
		}

		// Handle Ctrl+A to move cursor to beginning
		if (key.ctrl && input === "a") {
			setCursorPosition(0);
			return;
		}

		// Handle Ctrl+E to move cursor to end
		if (key.ctrl && input === "e") {
			setCursorPosition(value.length);
			return;
		}

		// Handle cursor movement with arrow keys (when not in arrow navigation mode for groups)
		if (!(flow === "static" && enableArrowNavigation)) {
			if (key.leftArrow) {
				setCursorPosition(Math.max(0, cursorPosition - 1));
				return;
			}

			if (key.rightArrow) {
				setCursorPosition(Math.min(value.length, cursorPosition + 1));
				return;
			}
		}

		// Handle static group navigation with arrow keys (only if enabled)
		if (flow === "static" && enableArrowNavigation) {
			if (key.downArrow) {
				if (!isLastInGroup) {
					// Always submit current value (even if empty) and move to next field
					// The completion logic will determine if empty fields are considered "completed"
					setSubmitted(true);
					onSubmit(value);
					return;
				}
				// On last field, down arrow does nothing (doesn't submit)
				return;
			} else if (key.upArrow) {
				// For up navigation in static groups with arrow navigation enabled
				if (!isFirstInGroup) {
					// Only navigate up if not on the first field (stay within group bounds)
					setSubmitted(true);
					onSubmit({ __preserveAndBack: true, value: value });
				}
				// If on first field, do nothing (don't exit the group)
				return;
			}
		}

		// Handle escape key for static groups (always enabled regardless of arrow navigation)
		if (flow === "static" && key.escape) {
			if (enableArrowNavigation && !isFirstInGroup) {
				// If arrow navigation is enabled and not on first field, escape moves up within group (preserve value)
				setSubmitted(true);
				onSubmit({ __preserveAndBack: true, value: value });
			} else if (enableArrowNavigation && isFirstInGroup) {
				// Escape on first field with arrow navigation: clear entire group and exit
				setSubmitted(true);
				onSubmit({ __clearGroupAndBack: true });
			} else {
				// Escape when arrow navigation is disabled: regular back behavior
				if (allowBack && onBack) {
					onBack();
				}
			}
			return;
		}

		if (key.return) {
			// Enter always submits the current value
			setSubmitted(true);
			onSubmit(value);
		} else if (key.backspace || key.delete) {
			if (cursorPosition > 0) {
				const newValue =
					value.slice(0, cursorPosition - 1) +
					value.slice(cursorPosition);
				setValue(newValue);
				setCursorPosition(cursorPosition - 1);
			}
		} else if (key.escape && flow !== "static") {
			// Regular escape behavior for non-static groups
			if (allowBack && onBack) {
				onBack();
			}
		} else if (!key.ctrl && !key.meta && input) {
			const newValue =
				value.slice(0, cursorPosition) +
				input +
				value.slice(cursorPosition);
			setValue(newValue);
			setCursorPosition(cursorPosition + 1);
		}
	});

	if (completed) {
		return (
			<Box gap={1}>
				<Box width={14}>
					<Text>{shortLabel || displayLabel}</Text>
				</Box>

				<Text>
					<Text color="blue">{completedValue || value}</Text>
				</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box gap={1}>
				<Box width={14}>
					<Text dimColor>{shortLabel || displayLabel}</Text>
				</Box>
				<Text dimColor>
					<Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection={flow === "static" ? "row" : "column"}
			gap={flow === "static" ? 1 : 0}
			marginBottom={flow === "static" && !isLastInGroup ? 1 : 0}
		>
			<Box width={flow === "static" ? 14 : undefined}>
				<Text>{displayLabel}</Text>
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
	);
}
