import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";


interface ConfirmFieldProps {
	message: string;
	onSubmit: (value: boolean | { __preserveAndBack: boolean; value: boolean }) => void;
	onBack?: () => void;
	initialValue?: boolean;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: boolean;
	disabled?: boolean;
	flow?: "phased" | "static";
	onNavigate?: (direction: 'up' | 'down') => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	[key: string]: any; // Allow any additional options
}

export function ConfirmField({
	message,
	onSubmit,
	onBack,
	initialValue = false,
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
	flow,
	onNavigate,
	isFirstInGroup = false,
	isLastInGroup = false,
	...rest
}: ConfirmFieldProps) {
	const [value, setValue] = useState<boolean | null>(initialValue);
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

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		// Handle static group navigation with arrow keys
		if (flow === "static") {
			if (key.downArrow) {
				if (!isLastInGroup) {
					if (value !== null) {
						// Submit current value and move to next field
						setSubmitted(true);
						onSubmit(value);
					} else {
						// No value selected, just navigate back (field remains incomplete/disabled)
						if (onBack) {
							onBack();
						}
					}
					return;
				}
				// On last field, down arrow does nothing
				return;
			} else if (key.upArrow) {
				// For up navigation, preserve current selection and go back
				setSubmitted(true);
				onSubmit({ __preserveAndBack: true, value: value || false });
				return;
			} else if (key.escape) {
				if (isFirstInGroup) {
					// On first field, escape exits the group (preserve value first)
					setSubmitted(true);
					onSubmit({ __preserveAndBack: true, value: value || false });
				} else {
					// On other fields, escape moves up (same as up arrow)
					setSubmitted(true);
					onSubmit({ __preserveAndBack: true, value: value || false });
				}
				return;
			}
		}

		if (key.return) {
			if (value !== null) {
				// Always submit the value, navigation will happen naturally
				setSubmitted(true);
				onSubmit(value);
			}
		} else if (key.escape && flow !== "static") {
			// Regular escape behavior for non-static groups
			if (allowBack && onBack) {
				onBack();
			}
		} else if (input.toLowerCase() === "y") {
			setValue(true);
		} else if (input.toLowerCase() === "n") {
			setValue(false);
		}
	});

	if (completed) {
		const displayValue = completedValue !== undefined ? completedValue : value;
		return (
			<Box flexDirection="column">
				<Text>{message}</Text>
				<Text>
					<Text color="green">✓ </Text>
					<Text color="gray">{displayValue ? "yes" : "no"}</Text>
				</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box flexDirection="column">
				<Text dimColor>{message}</Text>
				<Text dimColor>
					{"> "}
					<Text color="gray">...</Text>
					<Text color="gray"> [y/n]</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{message}</Text>
			<Text>
				{"> "}
				<Text color="cyan">
					{value === null ? "" : value ? "yes" : "no"}
				</Text>
				<Text dimColor> [y/n]</Text>
			</Text>
			<Text> </Text>
			<Text dimColor>
				<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
				<Text color="yellow">&lt;escape&gt;</Text> go back
			</Text>
		</Box>
	);
}
