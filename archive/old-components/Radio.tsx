import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { FieldProps, BaseFieldConfig, PublicFieldConfig } from "../../types.js";
import { validate } from "../../hooks/index.js";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

// Radio field specific configuration
export interface RadioFieldConfig extends BaseFieldConfig {
	options: Array<{ value: string; label: string }>;
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
}

// Public radio field configuration - excludes internal properties
export interface PublicRadioFieldConfig extends PublicFieldConfig {
	options: Array<{ value: string; label: string }>;
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
}

export function Radio({
	config,
	value,
	onChange,
	onSubmit,
	onBack,
	isActive,
	searchQuery = "",
	onSearchQueryChange,
}: FieldProps<string> & { config: RadioFieldConfig }) {
	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (value !== undefined && config.options) {
			const index = config.options.findIndex(
				(option) => option.value === value
			);
			return index >= 0 ? index : 0;
		}
		return 0;
	});

	const [error, setError] = useState<string | null>(null);

	const validateAndSetErrorValue = (value: string): boolean => {
		if (!config.options || config.options.length === 0) {
			setError("No options available");
			return false;
		}
		return validate(config, value, undefined, setError) as boolean;
	};

	// Filter options based on search query
	const filteredOptions =
		config.searchable && searchQuery.trim() && config.options
			? config.options.filter(
					(option) =>
						option.label
							.toLowerCase()
							.includes(searchQuery.toLowerCase()) ||
						option.value
							.toLowerCase()
							.includes(searchQuery.toLowerCase())
			  )
			: config.options || [];

	// Reset selected index when search query changes
	useEffect(() => {
		if (selectedIndex >= filteredOptions.length) {
			setSelectedIndex(Math.max(0, filteredOptions.length - 1));
		}
	}, [searchQuery, filteredOptions.length, selectedIndex]);

	useInput((input, key) => {
		if (!isActive) return;

		// Handle back navigation (Escape)
		if (key.escape) {
			if (onBack) {
				config.onBack?.();
				onBack();
			}
			return;
		}

		if (key.return) {
			if (filteredOptions.length > 0) {
				const selectedValue = filteredOptions[selectedIndex].value;
				if (validateAndSetErrorValue(selectedValue)) {
					onChange(selectedValue);
					onSubmit(selectedValue);
				}
			}
			return;
		}

		// Handle search input if searchable is enabled
		if (config.searchable && !key.ctrl && !key.meta && input.length === 1) {
			// Allow typing for search
			if (input.match(/[a-zA-Z0-9\s]/)) {
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
					: filteredOptions.length - 1;
			setSelectedIndex(newIndex);
			if (filteredOptions.length > 0) {
				const newValue = filteredOptions[newIndex].value;
				config.onInput?.(newValue);
			}
			return;
		}

		if (key.rightArrow) {
			const newIndex =
				selectedIndex < filteredOptions.length - 1
					? selectedIndex + 1
					: 0;
			setSelectedIndex(newIndex);
			if (filteredOptions.length > 0) {
				const newValue = filteredOptions[newIndex].value;
				config.onInput?.(newValue);
			}
			return;
		}

		if (key.upArrow) {
			const allowLoop = config.allowLoop !== false; // Default to true
			const newIndex = allowLoop
				? selectedIndex > 0
					? selectedIndex - 1
					: filteredOptions.length - 1
				: Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);
			if (filteredOptions.length > 0) {
				const newValue = filteredOptions[newIndex].value;
				config.onInput?.(newValue);
			}
			return;
		}

		if (key.downArrow) {
			const allowLoop = config.allowLoop !== false; // Default to true
			const newIndex = allowLoop
				? selectedIndex < filteredOptions.length - 1
					? selectedIndex + 1
					: 0
				: Math.min(filteredOptions.length - 1, selectedIndex + 1);
			setSelectedIndex(newIndex);
			if (filteredOptions.length > 0) {
				const newValue = filteredOptions[newIndex].value;
				config.onInput?.(newValue);
			}
			return;
		}

		// Handle number keys for direct selection (only if showNumbers is enabled)
		if (config.showNumbers === true) {
			const num = parseInt(input);
			if (!isNaN(num) && num >= 1 && num <= filteredOptions.length) {
				const newIndex = num - 1;
				setSelectedIndex(newIndex);
				const newValue = filteredOptions[newIndex].value;
				config.onInput?.(newValue);
				onChange(newValue);
				onSubmit(newValue);
				return;
			}
		}
	});

	// Update selected index when value changes
	useEffect(() => {
		if (value !== undefined) {
			const index = config.options.findIndex(
				(option) => option.value === value
			);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		}
	}, [value, config.options]);

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
			{filteredOptions.map((option, index) => {
				const isSelected = option.value === value;
				const isFocused = isActive && index === selectedIndex;
				const shouldShowCyan = isActive ? isFocused : isSelected;
				return (
					<Text
						key={option.value}
						color={shouldShowCyan ? "cyan" : "gray"}
					>
						{shouldShowCyan ? "●" : "○"}{" "}
						{config.showNumbers === true && `${index + 1}. `}
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
			{error && <Text color="red">Error: {error}</Text>}
		</Box>
	);
}
