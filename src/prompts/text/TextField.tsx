import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

type BackToken = { __back: true };

interface TextFieldProps {
	message: string;
	onSubmit: (value: string) => void;
	onBack?: () => void;
	initial?: string;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string;
	disabled?: boolean;
}

export function TextField({
	message,
	onSubmit,
	onBack,
	initial = "",
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
}: TextFieldProps) {
	const [value, setValue] = useState(initial);
	const [submitted, setSubmitted] = useState(false);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		if (key.return) {
			setSubmitted(true);
			onSubmit(value);
		} else if (key.backspace || key.delete) {
			setValue((prev) => prev.slice(0, -1));
		} else if (key.escape) {
			if (allowBack && onBack) {
				onBack();
			}
		} else if (!key.ctrl && !key.meta && input) {
			setValue((prev) => prev + input);
		}
	});

	if (completed) {
		return (
			<Box flexDirection="column">
				<Text>{message}</Text>
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
				<Text dimColor>{message}</Text>
				<Text dimColor>
					{"> "}
					<Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{message}</Text>
			<Text>
				{"> "}
				<Text color="cyan">{value}</Text>
			</Text>
			<Text> </Text>
			<Text dimColor>
				<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
				<Text color="yellow">&lt;escape&gt;</Text> go back
			</Text>
		</Box>
	);
}
