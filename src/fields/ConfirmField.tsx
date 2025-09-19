import React, { useState } from "react";
import { Text, Box, useInput } from "ink";

type BackToken = { __back: true };

interface ConfirmFieldProps {
	message: string;
	onSubmit: (value: boolean | BackToken) => void;
	initial?: boolean;
	allowBack?: boolean;
}

export function ConfirmField({
	message,
	onSubmit,
	initial = false,
	allowBack = true,
}: ConfirmFieldProps) {
	const [value, setValue] = useState<boolean | null>(initial);
	const [submitted, setSubmitted] = useState(false);

	useInput((input, key) => {
		if (submitted) return;

		if (key.return && value !== null) {
			setSubmitted(true);
			onSubmit(value);
		} else if (key.escape) {
			if (allowBack) {
				onSubmit({ __back: true });
			}
		} else if (input.toLowerCase() === "y") {
			setValue(true);
		} else if (input.toLowerCase() === "n") {
			setValue(false);
		}
	});

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
