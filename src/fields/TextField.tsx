import React, { useState } from "react";
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
}

export function TextField({
	message,
	onSubmit,
	onBack,
	initial = "",
	allowBack = true,
	completed = false,
	completedValue,
}: TextFieldProps) {
	const [value, setValue] = useState(initial);
	const [submitted, setSubmitted] = useState(false);

	useInput((input, key) => {
		if (submitted || completed) return;

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
