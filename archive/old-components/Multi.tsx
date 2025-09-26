import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { FieldProps, BaseFieldConfig, PublicFieldConfig } from "../../types.js";
import { validate, useOptionNavigationState } from "../../hooks/index.js";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

// Multi-select field specific configuration
export interface MultiFieldConfig extends BaseFieldConfig {
	options: Array<{ value: string; label: string }>;
	noneOption?: {
		label: string;
	};
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	initialValue?: string[]; // Initial selected values
}

// Public multi-select field configuration - excludes internal properties
export interface PublicMultiFieldConfig extends PublicFieldConfig {
	options: Array<{ value: string; label: string }>;
	noneOption?: {
		label: string;
	};
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	initialValue?: string[]; // Initial selected values
}

export function Multi({
	config,
	value,
	onChange,
	onSubmit,
	onBack,
	isActive,
	searchQuery = "",
	onSearchQueryChange,
}: FieldProps<string[]> & { config: MultiFieldConfig }) {
	const NONE_VALUE = "__NONE__";
	const [selectedValues, setSelectedValues] = useState<string[]>(() => {
		let initialValues: string[] = [];

		if (Array.isArray(value)) {
			initialValues = value;
		} else if (Array.isArray(config.initialValue)) {
			initialValues = config.initialValue;
		} else {
			initialValues = [];
		}

		// If noneOption is provided, adjust the initial state
		if (config.noneOption) {
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
	});

	const [error, setError] = useState<string | null>(null);

	const validateAndSetErrorValue = (value: string[]): boolean => {
		return validate(config, value, undefined, setError) as boolean;
	};

	// Filter options based on search query
	const filteredOptions =
		config.searchable && searchQuery.trim()
			? config.options.filter(
					(option) =>
						option.label
							.toLowerCase()
							.includes(searchQuery.toLowerCase()) ||
						option.value
							.toLowerCase()
							.includes(searchQuery.toLowerCase())
			  )
			: config.options;

	const totalOptions = config.options.length + (config.noneOption ? 1 : 0);
	const filteredTotalOptions =
		filteredOptions.length + (config.noneOption ? 1 : 0);
	const { selectedIndex, navigateUp, navigateDown, setIndex } =
		useOptionNavigationState(
			filteredTotalOptions,
			config.allowLoop !== false,
			0
		);

	const clearErrorValue = () => {
		setError(null);
	};

	const toggleSelection = (optionValue: string) => {
		const isNoneOption = config.noneOption && optionValue === NONE_VALUE;
		let newSelectedValues: string[];

		if (isNoneOption) {
			// Toggle None option - if selected, clear all others; if not selected, select only None
			if (selectedValues.includes(NONE_VALUE)) {
				newSelectedValues = [];
			} else {
				newSelectedValues = [NONE_VALUE];
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
		clearErrorValue();

		// Call callbacks with filtered values (excluding NONE_VALUE)
		const filteredValues = newSelectedValues.filter(
			(val) => val !== NONE_VALUE
		);
		config.onInput?.(filteredValues);
	};

	// Reset selected index when search query changes
	useEffect(() => {
		setIndex(0);
	}, [searchQuery]);

	useInput((input, key) => {
		if (!isActive) return;

		// Handle back navigation (Escape)
		if (key.escape) {
			// If there's a noneOption and regular options are selected, clear selections and select none first
			if (
				config.noneOption &&
				selectedValues.some((val) => val !== NONE_VALUE)
			) {
				setSelectedValues([NONE_VALUE]);
				clearErrorValue();
				config.onInput?.([]);
				return;
			}

			// Only go back if no regular options are selected (or no noneOption)
			if (onBack) {
				config.onBack?.();
				onBack();
				return;
			}
		}

		if (key.return) {
			// Filter out NONE_VALUE from the final result
			const finalValues = selectedValues.filter(
				(val) => val !== NONE_VALUE
			);
			if (validateAndSetErrorValue(finalValues)) {
				onChange(finalValues);
				onSubmit(finalValues);
			}
			return;
		}

		// Handle spacebar for toggling selection (must come before search input handling)
		if (input === " ") {
			const isNoneOption = config.noneOption && selectedIndex === 0;
			const currentOption = isNoneOption
				? { value: NONE_VALUE, label: config.noneOption!.label }
				: filteredOptions[selectedIndex - (config.noneOption ? 1 : 0)];

			toggleSelection(currentOption.value);
			return;
		}

		// Handle search input if searchable is enabled
		if (config.searchable && !key.ctrl && !key.meta && input.length === 1) {
			// Allow typing for search (excluding spacebar which is handled above)
			if (input.match(/[a-zA-Z0-9]/)) {
				const newQuery = searchQuery + input;
				onSearchQueryChange?.(newQuery);
				return;
			}
		}

		// Handle backspace for search (on macOS, backspace is detected as delete)
		if (
			config.searchable &&
			(key.backspace || key.delete || input === "\b")
		) {
			const newQuery = searchQuery.slice(0, -1);
			onSearchQueryChange?.(newQuery);
			return;
		}

		if (key.leftArrow) {
			const newIndex =
				selectedIndex > 0
					? selectedIndex - 1
					: filteredTotalOptions - 1;
			setIndex(newIndex);
			return;
		}

		if (key.rightArrow) {
			const newIndex =
				selectedIndex < filteredTotalOptions - 1
					? selectedIndex + 1
					: 0;
			setIndex(newIndex);
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
		if (config.showNumbers === true) {
			const num = parseInt(input);
			if (!isNaN(num) && num >= 1 && num <= filteredTotalOptions) {
				const newIndex = num - 1;
				setIndex(newIndex);

				const isNoneOption = config.noneOption && newIndex === 0;
				const currentOption = isNoneOption
					? { value: NONE_VALUE, label: config.noneOption!.label }
					: filteredOptions[newIndex - (config.noneOption ? 1 : 0)];

				toggleSelection(currentOption.value);
				return;
			}
		}
	});

	// Update selected state when value prop changes (for new fields)
	useEffect(() => {
		let newValues: string[] = [];

		if (Array.isArray(value)) {
			newValues = value;
		} else if (Array.isArray(config.initialValue)) {
			newValues = config.initialValue;
		} else {
			newValues = [];
		}

		// If noneOption is provided, adjust the state
		if (config.noneOption) {
			const hasRegularSelections = newValues.some(
				(val) => val !== NONE_VALUE
			);
			if (hasRegularSelections) {
				// Remove NONE_VALUE if any regular options are selected
				setSelectedValues(
					newValues.filter((val) => val !== NONE_VALUE)
				);
			} else if (newValues.length === 0) {
				// If no options are selected at all, add NONE_VALUE
				setSelectedValues([NONE_VALUE]);
			} else {
				// If only NONE_VALUE is selected, keep it
				setSelectedValues(newValues);
			}
		} else {
			setSelectedValues(newValues);
		}
	}, [value, config.initialValue, config.noneOption]);

	// Render message - either as markdown or plain text
	const renderMessage = () => {
		if (!config.message) return null;

		if (isMarkdownString(config.message)) {
			const elements = parseMarkdown(
				config.message.content,
				config.message.theme
			);
			return (
				<Box flexDirection="column">
					{elements.map((element, index) => (
						<Box key={index}>{element}</Box>
					))}
				</Box>
			);
		}

		return <Text>{config.message}</Text>;
	};

	return (
		<Box flexDirection="column">
			{renderMessage()}
			{config.searchable && (
				<Text color="blue">
					Search: {searchQuery || "(type to search)"}
				</Text>
			)}
			{config.noneOption &&
				(() => {
					const isSelected = selectedValues.includes(NONE_VALUE);
					const isFocused = isActive && selectedIndex === 0;
					const shouldShowCyan = isSelected;
					return (
						<Text color={shouldShowCyan ? "cyan" : "gray"}>
							{isSelected ? "■" : "□"}{" "}
							{config.showNumbers === true && "1. "}
							{config.noneOption.label}
							{isFocused && <Text color="yellow">█</Text>}
						</Text>
					);
				})()}
			{filteredOptions.map((option, index) => {
				const displayIndex = index + (config.noneOption ? 2 : 1);
				const optionIndex = index + (config.noneOption ? 1 : 0);
				const isSelected = selectedValues.includes(option.value);
				const isFocused = isActive && optionIndex === selectedIndex;
				const shouldShowCyan = isSelected;
				return (
					<Text
						key={option.value}
						color={shouldShowCyan ? "cyan" : "gray"}
					>
						{isSelected ? "■" : "□"}{" "}
						{config.showNumbers === true && `${displayIndex}. `}
						{option.label}
						{isFocused && <Text color="yellow">█</Text>}
					</Text>
				);
			})}
			{config.searchable &&
				filteredOptions.length === 0 &&
				searchQuery.trim() && (
					<Text color="red">No options match "{searchQuery}"</Text>
				)}
			{error && <Text color="red">{error}</Text>}
		</Box>
	);
}

// Custom completion component for Multi fields
export function MultiCompletion({
	config,
	value,
	searchQuery = "",
}: FieldProps<string[]> & { config: MultiFieldConfig }) {
	const NONE_VALUE = "__NONE__";
	const hasNoneSelected = Array.isArray(value) && value.includes(NONE_VALUE);
	const selectedOptions = config.options.filter(
		(option) => Array.isArray(value) && value.includes(option.value)
	);

	// Filter options based on search query for completion display
	// Always include selected options even if they don't match the search
	const filteredOptions = (() => {
		if (!config.searchable || !searchQuery.trim()) {
			return config.options;
		}

		const matchingOptions = config.options.filter(
			(option) =>
				option.label
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				option.value.toLowerCase().includes(searchQuery.toLowerCase())
		);

		// Always include selected options at the top, even if they don't match the search
		const selectedOptions = config.options.filter(
			(option) => Array.isArray(value) && value.includes(option.value)
		);

		// Remove selected options from matching options to avoid duplicates
		const otherMatchingOptions = matchingOptions.filter(
			(option) => !Array.isArray(value) || !value.includes(option.value)
		);

		// Put selected options first, then other matching options
		return [...selectedOptions, ...otherMatchingOptions];
	})();

	// Render message - either as markdown or plain text
	const renderMessage = () => {
		if (!config.message) return null;

		if (isMarkdownString(config.message)) {
			const elements = parseMarkdown(
				config.message.content,
				config.message.theme
			);
			return (
				<Box flexDirection="column">
					<Text color="green">✓ </Text>
					{elements.map((element, index) => (
						<Box key={index}>{element}</Box>
					))}
				</Box>
			);
		}

		return <Text color="green">✓ {config.message}</Text>;
	};

	return (
		<Box flexDirection="column">
			{renderMessage()}
			{config.searchable && searchQuery.trim() && (
				<Text color="blue">Search: {searchQuery}</Text>
			)}
			{config.noneOption && (
				<Text color={hasNoneSelected ? "cyan" : "gray"}>
					{hasNoneSelected ? "■" : "□"}{" "}
					{config.showNumbers === true && "1. "}
					{config.noneOption.label}
					{hasNoneSelected && <Text color="yellow">█</Text>}
				</Text>
			)}
			{filteredOptions.map((option, index) => {
				const isSelected =
					Array.isArray(value) && value.includes(option.value);
				return (
					<Text
						key={option.value}
						color={isSelected ? "cyan" : "gray"}
					>
						{isSelected ? "■" : "□"}{" "}
						{config.showNumbers === true &&
							`${index + (config.noneOption ? 2 : 1)}. `}
						{option.label}
						{isSelected && <Text color="yellow">█</Text>}
					</Text>
				);
			})}
			{config.searchable &&
				filteredOptions.length === 0 &&
				searchQuery.trim() && (
					<Text color="red">No options match "{searchQuery}"</Text>
				)}
		</Box>
	);
}
