import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

type BackToken = { __back: true };

interface ValidatedTextFieldProps {
	message: string;
	validate?: (value: string) => string | true;
	transform?: (value: string) => string;
	onSubmit: (value: string) => void;
	onBack?: () => void;
	initial?: string;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string;
	disabled?: boolean;
}

export function ValidatedTextField({
	message,
	validate,
	transform,
	onSubmit,
	onBack,
	initial = "",
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
}: ValidatedTextFieldProps) {
	const [value, setValue] = useState(initial);
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string>("");

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
			setError("");
		}
	}, [disabled, submitted]);

	// Separately handle value restoration when initial changes
	useEffect(() => {
		if (!submitted && !disabled) {
			setValue(initial);
			setError("");
		}
	}, [initial, submitted, disabled]);

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		if (key.return) {
			// Validate before submitting
			if (validate) {
				const validationResult = validate(value);
				if (validationResult !== true) {
					setError(validationResult);
					return; // Don't submit if validation fails
				}
			}

			setError(""); // Clear any previous errors
			setSubmitted(true);

			// Apply transformation if provided
			const finalValue = transform ? transform(value) : value;
			onSubmit(finalValue);
		} else if (key.backspace || key.delete) {
			setValue((prev) => prev.slice(0, -1));
			setError(""); // Clear error when user types
		} else if (key.escape) {
			if (allowBack && onBack) {
				onBack();
			}
		} else if (!key.ctrl && !key.meta && input) {
			setValue((prev) => prev + input);
			setError(""); // Clear error when user types
		}
	});

	if (completed) {
		return (
			<Box flexDirection="column">
				<Text>🔍 {message}</Text>
				<Text>
					<Text color="green">✓ </Text>
					<Text color="gray">{completedValue || value}</Text>
				</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box flexDirection="column">
				<Text dimColor>🔍 {message}</Text>
				<Text dimColor>
					→ <Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>🔍 {message}</Text>
			{validate && <Text dimColor color="blue">   ✓ Validation enabled</Text>}
			{transform && <Text dimColor color="blue">   🔄 Transform enabled</Text>}
			<Text>
				→ <Text color="cyan">{value}</Text>
			</Text>
			{error && (
				<Text color="red">
					❌ {error}
				</Text>
			)}
			<Text> </Text>
			<Text dimColor>
				<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
				<Text color="yellow">&lt;escape&gt;</Text> go back
			</Text>
		</Box>
	);
}