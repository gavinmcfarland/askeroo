import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";

type BackToken = { __back: true };

interface MultiFieldProps {
	message: string;
	options: string[];
	initial?: string[];
	onSubmit: (values: string[]) => void;
	onBack?: () => void;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string[];
	disabled?: boolean;
}

export function MultiField({
	message,
	options,
	initial = [],
	onSubmit,
	onBack,
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
}: MultiFieldProps) {
	// Initialize selectedIndices based on initial values
	const getInitialIndices = () => {
		const indices = new Set<number>();
		initial.forEach(value => {
			const index = options.indexOf(value);
			if (index !== -1) {
				indices.add(index);
			}
		});
		return indices;
	};

	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(getInitialIndices());
	const [currentIndex, setCurrentIndex] = useState(0);
	const [submitted, setSubmitted] = useState(false);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Update selected indices when initial values change
	useEffect(() => {
		if (!submitted && !disabled) {
			const indices = new Set<number>();
			initial.forEach(value => {
				const index = options.indexOf(value);
				if (index !== -1) {
					indices.add(index);
				}
			});
			setSelectedIndices(indices);
		}
	}, [initial, options, submitted, disabled]);

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		if (key.return) {
			const selectedValues = Array.from(selectedIndices).map(i => options[i]);
			setSubmitted(true);
			onSubmit(selectedValues);
		} else if (key.upArrow) {
			setCurrentIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		} else if (key.downArrow) {
			setCurrentIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		} else if (input === ' ') {
			setSelectedIndices((prev) => {
				const newSet = new Set(prev);
				if (newSet.has(currentIndex)) {
					newSet.delete(currentIndex);
				} else {
					newSet.add(currentIndex);
				}
				return newSet;
			});
		} else if (key.escape) {
			if (allowBack && onBack) {
				onBack();
			}
		}
	});

	if (completed) {
		return (
			<Box flexDirection="column">
				<Text>🎨 {message}</Text>
				<Text>
					<Text color="green">✓ </Text>
					<Text color="gray">{(completedValue || []).join(", ")}</Text>
				</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box flexDirection="column">
				<Text dimColor>🎨 {message}</Text>
				<Text dimColor>→ <Text color="gray">...</Text></Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>🎨 {message}</Text>
			<Text dimColor>   Selected: {selectedIndices.size} item(s)</Text>
			<Text> </Text>
			{options.map((option, index) => {
				const isSelected = selectedIndices.has(index);
				const isCurrent = index === currentIndex;
				const prefix = isCurrent ? "→" : " ";
				const checkbox = isSelected ? "☑" : "☐";

				return (
					<Text key={index} color={isCurrent ? "cyan" : undefined}>
						{prefix} {checkbox} {option}
					</Text>
				);
			})}
			<Text> </Text>
			<Text dimColor>
				<Text color="yellow">&lt;↑↓&gt;</Text> navigate,{" "}
				<Text color="yellow">&lt;space&gt;</Text> select,{" "}
				<Text color="yellow">&lt;enter&gt;</Text> proceed,{" "}
				<Text color="yellow">&lt;escape&gt;</Text> go back
			</Text>
		</Box>
	);
}