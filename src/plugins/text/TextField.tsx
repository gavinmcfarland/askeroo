import { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

interface Props {
	message: string;
	shortMessage?: string;
	onSubmit: (value: string) => void;
	onBack?: () => void;
	initialValue?: string;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string;
	disabled?: boolean;
	flow?: "phased" | "static";
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
		if (!submitted && !disabled) {
			setValue(initialValue);
		}
	}, [initialValue, submitted, disabled]);

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
			<Box>
				<Box width={12}>
					<Text>{shortMessage || message}</Text>
				</Box>

				<Text>
					<Text color="cyan">{completedValue || value}</Text>
				</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box>
				<Text dimColor>{shortMessage || message}</Text>
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
			{flow !== "static" && (
				<>
					<Text> </Text>
					<Text dimColor>
						<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
						<Text color="yellow">&lt;escape&gt;</Text> go back
					</Text>
				</>
			)}
		</Box>
	);
}
