import React, { useState, useEffect, useMemo, useRef } from "react";
import { Text, Box, useInput } from "ink";

interface MultiFieldProps {
	message: string;
	options?: string[];
	initialValue?: string[];
	onSubmit: (values: string[]) => void;
	onBack?: () => void;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string[];
	disabled?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
	[key: string]: any; // Allow any additional options
}

export function MultiField({
	message,
	options = [],
	initialValue = [],
	onSubmit,
	onBack,
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
	onHintChange,
	isFirstRootPrompt = false,
	...rest
}: MultiFieldProps) {
	// Initialize selectedIndices based on initialValue
	const getInitialIndices = () => {
		const indices = new Set<number>();
		initialValue.forEach((value) => {
			const index = options.indexOf(value);
			if (index !== -1) {
				indices.add(index);
			}
		});
		return indices;
	};

	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
		getInitialIndices()
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [submitted, setSubmitted] = useState(false);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			const hintText = (
				<>
					<Text color="yellow">&lt;↑↓&gt;</Text> navigate,{" "}
					<Text color="yellow">&lt;space&gt;</Text> select,{" "}
					<Text color="yellow">&lt;enter&gt;</Text> proceed
					{!isFirstRootPrompt && (
						<>
							,{" "}
							<Text color="yellow">&lt;escape&gt;</Text> go back
						</>
					)}
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [disabled, completed, isFirstRootPrompt]); // Removed onHintChange from dependencies

	// Memoize the initialValue to prevent unnecessary re-renders
	const stableInitial = useMemo(() => {
		return [...initialValue];
	}, [initialValue.join(",")]);

	// Track previous initialValue to detect actual changes
	const prevInitialRef = useRef<string[]>([]);

	// Update selected indices when initialValue actually changes
	useEffect(() => {
		if (!submitted && !disabled) {
			// Check if initialValue actually changed
			const initialChanged =
				stableInitial.length !== prevInitialRef.current.length ||
				stableInitial.some(
					(val, idx) => val !== prevInitialRef.current[idx]
				);

			if (initialChanged) {
				const indices = new Set<number>();
				stableInitial.forEach((value) => {
					const index = options.indexOf(value);
					if (index !== -1) {
						indices.add(index);
					}
				});
				setSelectedIndices(indices);
				prevInitialRef.current = [...stableInitial];
			}
		}
	}, [stableInitial, options, submitted, disabled]);

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		if (key.return) {
			const selectedValues = Array.from(selectedIndices).map(
				(i) => options[i]
			);
			setSubmitted(true);
			onSubmit(selectedValues);
		} else if (key.upArrow) {
			setCurrentIndex((prev) =>
				prev > 0 ? prev - 1 : options.length - 1
			);
		} else if (key.downArrow) {
			setCurrentIndex((prev) =>
				prev < options.length - 1 ? prev + 1 : 0
			);
		} else if (input === " ") {
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
			<Box flexDirection="row" gap={1}>
				<Text>{message}</Text>
				<Text color="blue">{(completedValue || []).join(", ")}</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box flexDirection="row" gap={1}>
				<Text dimColor>{message}</Text>
				<Text dimColor>
					<Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{message}</Text>
			<Text dimColor>Selected: {selectedIndices.size} item(s)</Text>
			<Text> </Text>
			{options.map((option, index) => {
				const isSelected = selectedIndices.has(index);
				const isCurrent = index === currentIndex;
				const prefix = isCurrent ? ">" : " ";
				const checkbox = isSelected ? "■" : "☐";

				return (
					<Text key={index} color={isCurrent ? "cyan" : undefined}>
						{prefix} {checkbox} {option}
					</Text>
				);
			})}
		</Box>
	);
}
