import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

type BackToken = { __back: true };

interface ConfirmFieldProps {
	message: string;
	onSubmit: (value: boolean) => void;
	onBack?: () => void;
	initial?: boolean;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: boolean;
	disabled?: boolean;
	[key: string]: any; // Allow any additional options
}

export function ConfirmField({
	message,
	onSubmit,
	onBack,
	initial = false,
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
	...rest
}: ConfirmFieldProps) {
	const [value, setValue] = useState<boolean | null>(initial);
	const [submitted, setSubmitted] = useState(false);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Separately handle value restoration when initial changes
	useEffect(() => {
		if (!submitted && !disabled) {
			setValue(initial);
		}
	}, [initial, submitted, disabled]);

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		if (key.return && value !== null) {
			setSubmitted(true);
			onSubmit(value);
		} else if (key.escape) {
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
