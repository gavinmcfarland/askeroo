import { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

interface Props {
	message: string;
	shortMessage?: string;
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
	flow?: "phased" | "static";
	onNavigate?: (direction: "up" | "down") => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
}

export function TextField({
	message,
	shortMessage,
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
}: Props) {
	const [value, setValue] = useState(initialValue);
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
		}
	}, [initialValue, disabled]);

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			const hintText = (
				<>
					<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
					<Text color="yellow">&lt;escape&gt;</Text> go back
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [disabled, completed, flow]); // Removed onHintChange from dependencies

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

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
			setValue((prev) => prev.slice(0, -1));
		} else if (key.escape && flow !== "static") {
			// Regular escape behavior for non-static groups
			if (allowBack && onBack) {
				onBack();
			}
		} else if (!key.ctrl && !key.meta && input) {
			setValue((prev) => prev + input);
		}
	});

	if (completed) {
		return (
			<Box gap={1}>
				<Box width={14}>
					<Text>{shortMessage || message}</Text>
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
				<Text dimColor>{shortMessage || message}</Text>
				<Text dimColor>
					<Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="row" gap={1}>
			<Text>{message}</Text>
			<Text>
				<Text color="cyan">{value}</Text>
			</Text>
			{/* {flow !== "static" && (
				<>
					<Text> </Text>
					<Text dimColor>
						<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
						<Text color="yellow">&lt;escape&gt;</Text> go back
					</Text>
				</>
			)} */}
		</Box>
	);
}
