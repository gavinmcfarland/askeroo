import React, { useState, useEffect, useMemo, useRef } from "react";
import { Text, Box, useInput } from "ink";

interface MultiFieldOption {
	value: string;
	label: string;
}

interface MultiFieldProps {
	label: string;
	options?: string[] | MultiFieldOption[];
	initialValue?: string[];
	onSubmit: (values: string[]) => void;
	onBack?: () => void;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string[];
	disabled?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
	noneOption?: {
		label: string;
	};
	showNumbers?: boolean;
	allowLoop?: boolean;
	searchable?: boolean;
	searchQuery?: string;
	onSearchQueryChange?: (query: string) => void;
	[key: string]: any; // Allow any additional options
}

export function MultiField({
	label,
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
	noneOption,
	showNumbers = false,
	allowLoop = true,
	searchable = false,
	searchQuery = "",
	onSearchQueryChange,
	...rest
}: MultiFieldProps) {
	const NONE_VALUE = "__NONE__";
	// Normalize options to support both string[] and MultiFieldOption[]
	const normalizedOptions: MultiFieldOption[] = useMemo(() => {
		return options.map((option) =>
			typeof option === "string"
				? { value: option, label: option }
				: option
		);
	}, [options]);

	// Initialize selectedValues based on initialValue
	const getInitialValues = (): string[] => {
		let initialValues: string[] = [];

		if (Array.isArray(initialValue)) {
			initialValues = initialValue;
		} else {
			initialValues = [];
		}

		// If noneOption is provided, adjust the initial state
		if (noneOption) {
			const hasRegularSelections = initialValues.some(
				(val) => val !== NONE_VALUE
			);
			if (hasRegularSelections) {
				// Remove NONE_VALUE if any regular options are selected
				return initialValues.filter((val) => val !== NONE_VALUE);
			} else if (initialValues.length === 0) {
				// If no options are selected at all, add NONE_VALUE
				return [NONE_VALUE];
			} else {
				// If only NONE_VALUE is selected, keep it
				return initialValues;
			}
		}

		return initialValues;
	};

	const [selectedValues, setSelectedValues] = useState<string[]>(
		getInitialValues()
	);

	// Internal search state management
	const [internalSearchQuery, setInternalSearchQuery] = useState("");
	const currentSearchQuery = internalSearchQuery;

	// Filter options based on search query
	const filteredOptions = useMemo(() => {
		if (!searchable || !currentSearchQuery.trim()) {
			return normalizedOptions;
		}

		// Keep all options in their original order, showing both selected and matching options
		// Selected options stay in place, they don't move to the top
		return normalizedOptions.filter((option) => {
			const isSelected = selectedValues.includes(option.value);
			const matchesSearch =
				option.label
					.toLowerCase()
					.includes(currentSearchQuery.toLowerCase()) ||
				option.value
					.toLowerCase()
					.includes(currentSearchQuery.toLowerCase());

			// Show option if it's selected OR if it matches the search
			return isSelected || matchesSearch;
		});
	}, [normalizedOptions, searchable, currentSearchQuery, selectedValues]);

	const totalOptions = filteredOptions.length + (noneOption ? 1 : 0);

	// Simple navigation state
	const [selectedIndex, setSelectedIndex] = useState(0);

	const navigateUp = () => {
		const newIndex = allowLoop
			? selectedIndex > 0
				? selectedIndex - 1
				: totalOptions - 1
			: Math.max(0, selectedIndex - 1);
		setSelectedIndex(newIndex);
	};

	const navigateDown = () => {
		const newIndex = allowLoop
			? selectedIndex < totalOptions - 1
				? selectedIndex + 1
				: 0
			: Math.min(totalOptions - 1, selectedIndex + 1);
		setSelectedIndex(newIndex);
	};
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Toggle selection function
	const toggleSelection = (optionValue: string) => {
		const isNoneOption = noneOption && optionValue === NONE_VALUE;
		let newSelectedValues: string[];

		if (isNoneOption) {
			// None option - if not selected, select it; if already selected, do nothing (can't unselect)
			if (!selectedValues.includes(NONE_VALUE)) {
				newSelectedValues = [NONE_VALUE];
			} else {
				// None is already selected, don't allow unselecting it
				return;
			}
		} else {
			// Regular option - if None is selected, clear it first
			const filteredValues = selectedValues.filter(
				(v) => v !== NONE_VALUE
			);
			newSelectedValues = filteredValues.includes(optionValue)
				? filteredValues.filter((v) => v !== optionValue)
				: [...filteredValues, optionValue];
		}

		setSelectedValues(newSelectedValues);
		setError(null);
	};

	// Adjust focus when filtered options change to ensure it stays within bounds
	useEffect(() => {
		const maxIndex = filteredOptions.length + (noneOption ? 1 : 0) - 1;
		if (selectedIndex > maxIndex) {
			setSelectedIndex(Math.max(0, maxIndex));
		}
	}, [filteredOptions, noneOption, selectedIndex]);

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
					<Text color="yellow">&lt;enter&gt;</Text> proceed
					{!isFirstRootPrompt && (
						<>
							, <Text color="yellow">&lt;escape&gt;</Text> go
							back,{" "}
						</>
					)}
					<Text color="yellow">&lt;↑↓&gt;</Text> navigate,{" "}
					<Text color="yellow">&lt;space&gt;</Text> select{" "}
					{searchable && (
						<>
							, <Text color="yellow">&lt;type&gt;</Text> to search
						</>
					)}
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [disabled, completed, isFirstRootPrompt, searchable]);

	// Memoize the initialValue to prevent unnecessary re-renders
	const stableInitial = useMemo(() => {
		return [...initialValue];
	}, [initialValue.join(",")]);

	// Track previous initialValue to detect actual changes
	const prevInitialRef = useRef<string[]>([]);

	// Update selected values when initialValue actually changes
	useEffect(() => {
		if (!submitted && !disabled) {
			// Check if initialValue actually changed
			const initialChanged =
				stableInitial.length !== prevInitialRef.current.length ||
				stableInitial.some(
					(val, idx) => val !== prevInitialRef.current[idx]
				);

			if (initialChanged) {
				let newValues: string[] = [...stableInitial];

				// If noneOption is provided, adjust the state
				if (noneOption) {
					const hasRegularSelections = newValues.some(
						(val) => val !== NONE_VALUE
					);
					if (hasRegularSelections) {
						// Remove NONE_VALUE if any regular options are selected
						newValues = newValues.filter(
							(val) => val !== NONE_VALUE
						);
					} else if (newValues.length === 0) {
						// If no options are selected at all, add NONE_VALUE
						newValues = [NONE_VALUE];
					}
				}

				setSelectedValues(newValues);
				prevInitialRef.current = [...stableInitial];
			}
		}
	}, [stableInitial, normalizedOptions, submitted, disabled, noneOption]);

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		// Handle search input FIRST if searchable is enabled
		if (searchable && input && input !== " ") {
			// Debug log
			// Check if it's a printable character (not a special key)
			if (
				input.length === 1 &&
				!key.ctrl &&
				!key.meta &&
				!key.return &&
				!key.escape &&
				!key.upArrow &&
				!key.downArrow &&
				!key.leftArrow &&
				!key.rightArrow
			) {
				const newQuery = currentSearchQuery + input;
				setInternalSearchQuery(newQuery);
				return;
			}
		}

		// Handle back navigation (Escape)
		if (key.escape) {
			// If searching, clear the search query first
			if (searchable && currentSearchQuery.trim()) {
				setInternalSearchQuery("");
				return;
			}

			// If there's a noneOption and regular options are selected, clear selections and select none first
			if (
				noneOption &&
				selectedValues.some((val) => val !== NONE_VALUE)
			) {
				setSelectedValues([NONE_VALUE]);
				setError(null);
				return;
			}

			// Only go back if no regular options are selected (or no noneOption)
			if (allowBack && onBack) {
				onBack();
				return;
			}
		}

		if (key.return) {
			// Filter out NONE_VALUE from the final result
			const finalValues = selectedValues.filter(
				(val) => val !== NONE_VALUE
			);
			setSubmitted(true);
			onSubmit(finalValues);
			return;
		}

		// Handle spacebar for toggling selection
		if (input === " ") {
			const isNoneOption = noneOption && selectedIndex === 0;
			const currentOption = isNoneOption
				? { value: NONE_VALUE, label: noneOption!.label }
				: filteredOptions[selectedIndex - (noneOption ? 1 : 0)];

			if (currentOption) {
				toggleSelection(currentOption.value);
			}
			return;
		}

		// Handle backspace for search
		if (searchable && (key.backspace || key.delete || input === "\b")) {
			const newQuery = currentSearchQuery.slice(0, -1);
			setInternalSearchQuery(newQuery);
			return;
		}

		if (key.leftArrow) {
			const newIndex =
				selectedIndex > 0 ? selectedIndex - 1 : totalOptions - 1;
			setSelectedIndex(newIndex);
			return;
		}

		if (key.rightArrow) {
			const newIndex =
				selectedIndex < totalOptions - 1 ? selectedIndex + 1 : 0;
			setSelectedIndex(newIndex);
			return;
		}

		if (key.upArrow) {
			navigateUp();
			return;
		}

		if (key.downArrow) {
			navigateDown();
			return;
		}

		// Handle number keys for direct selection toggle (only if showNumbers is enabled)
		if (showNumbers) {
			const num = parseInt(input);
			if (!isNaN(num) && num >= 1 && num <= totalOptions) {
				const newIndex = num - 1;
				setSelectedIndex(newIndex);

				const isNoneOption = noneOption && newIndex === 0;
				const currentOption = isNoneOption
					? { value: NONE_VALUE, label: noneOption!.label }
					: filteredOptions[newIndex - (noneOption ? 1 : 0)];

				if (currentOption) {
					toggleSelection(currentOption.value);
				}
				return;
			}
		}
	});

	if (completed) {
		return (
			<Box flexDirection="row" gap={1}>
				<Text>{label}</Text>
				<Text color="blue">{(completedValue || []).join(", ")}</Text>
			</Box>
		);
	}

	if (disabled) {
		return (
			<Box flexDirection="row" gap={1}>
				<Text dimColor>{label}</Text>
				<Text dimColor>
					<Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{label}</Text>
			{noneOption &&
				(() => {
					const isSelected = selectedValues.includes(NONE_VALUE);
					const isFocused = selectedIndex === 0;
					const color = isFocused
						? "red"
						: isSelected
						? "cyan"
						: "gray";
					return (
						<Text color={color}>
							{isSelected ? "■" : "□"} {showNumbers && "1. "}
							{noneOption.label}
						</Text>
					);
				})()}
			{filteredOptions.map((option, index) => {
				const displayIndex = index + (noneOption ? 2 : 1);
				const optionIndex = index + (noneOption ? 1 : 0);
				const isSelected = selectedValues.includes(option.value);
				const isFocused = optionIndex === selectedIndex;
				const color = isFocused
					? "cyan"
					: isSelected
					? "white"
					: "gray";

				// Highlight matching text if searching
				const renderLabel = () => {
					if (!searchable || !currentSearchQuery.trim()) {
						return option.label;
					}

					const query = currentSearchQuery.toLowerCase();
					const label = option.label;
					const lowerLabel = label.toLowerCase();
					const matchIndex = lowerLabel.indexOf(query);

					if (matchIndex === -1) {
						return label; // No match found, return original
					}

					const beforeMatch = label.slice(0, matchIndex);
					const match = label.slice(
						matchIndex,
						matchIndex + query.length
					);
					const afterMatch = label.slice(matchIndex + query.length);

					return (
						<>
							{beforeMatch}
							<Text backgroundColor="grey" color="black">
								{match}
							</Text>
							{afterMatch}
						</>
					);
				};

				return (
					<Text key={option.value} color={color}>
						{isSelected ? "■" : "□"}{" "}
						{showNumbers && `${displayIndex}. `}
						{renderLabel()}
					</Text>
				);
			})}
			{searchable &&
				filteredOptions.length === 0 &&
				currentSearchQuery.trim() && (
					<Text color="red">
						No options match "{currentSearchQuery}"
					</Text>
				)}
			{error && <Text color="red">{error}</Text>}
		</Box>
	);
}
