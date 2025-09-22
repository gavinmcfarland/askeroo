import React, { useState } from "react";
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
}

export function ConfirmField({
	message,
	onSubmit,
	onBack,
	initial = false,
	allowBack = true,
	completed = false,
	completedValue,
}: ConfirmFieldProps) {
	const [value, setValue] = useState<boolean | null>(initial);
	const [submitted, setSubmitted] = useState(false);

	useInput((input, key) => {
		if (submitted || completed) return;

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
