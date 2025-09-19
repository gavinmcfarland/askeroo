import React, { useState } from "react";
import { Text, Box, useInput } from "ink";

type BackToken = { __back: true };

interface TextFieldProps {
	message: string;
	onSubmit: (value: string | BackToken) => void;
	initial?: string;
}

export function TextField({ message, onSubmit, initial = "" }: TextFieldProps) {
	const [value, setValue] = useState(initial);
	const [submitted, setSubmitted] = useState(false);

	useInput((input, key) => {
		if (submitted) return;

		if (key.return) {
			setSubmitted(true);
			onSubmit(value);
		} else if (key.backspace || key.delete) {
			setValue((prev) => prev.slice(0, -1));
		} else if (key.escape) {
			onSubmit({ __back: true });
		} else if (!key.ctrl && !key.meta && input) {
			setValue((prev) => prev + input);
		}
	});

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
