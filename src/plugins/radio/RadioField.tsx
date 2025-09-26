import { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { parseMarkdown, isMarkdownString } from "../../utils/markdown.js";

interface RadioOption {
	value: string;
	label: string;
}

interface Props {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	onSubmit: (
		value:
			| string
			| { __preserveAndBack: boolean; value: string }
			| { __clearGroupAndBack: boolean }
	) => void;
	onBack?: () => void;
	initialValue?: string;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string;
	disabled?: boolean;
	flow?: "progressive" | "phased" | "static";
	onNavigate?: (direction: "up" | "down") => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
}

export function RadioField({
	label,
	shortLabel,
	options = [],
	showNumbers = false,
	allowLoop = true,
	searchable = false,
	onSubmit,
	onBack,
	initialValue,
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
	flow,
	onNavigate,
	isFirstInGroup = false,
	isLastInGroup = false,
	enableArrowNavigation = false,
	onHintChange,
	isFirstRootPrompt = false,
}: Props) {
	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (initialValue && options) {
			const index = options.findIndex(
				(option) => option.value === initialValue
			);
			return index >= 0 ? index : 0;
		}
		return 0;
	});

	const [searchQuery, setSearchQuery] = useState("");
	const [submitted, setSubmitted] = useState(false);

	// Filter options based on search query
	const filteredOptions =
		searchable && searchQuery.trim() && options
			? options.filter(
					(option) =>
						option.label
							.toLowerCase()
							.includes(searchQuery.toLowerCase()) ||
						option.value
							.toLowerCase()
							.includes(searchQuery.toLowerCase())
			  )
			: options || [];

	// Reset selected index when search query changes
	useEffect(() => {
		if (selectedIndex >= filteredOptions.length) {
			setSelectedIndex(Math.max(0, filteredOptions.length - 1));
		}
	}, [searchQuery, filteredOptions.length, selectedIndex]);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Update selected index when initialValue changes
	useEffect(() => {
		if (initialValue !== undefined) {
			const index = options.findIndex(
				(option) => option.value === initialValue
			);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		}
	}, [initialValue, options]);

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			const hintText = (
				<>
					<Text color="yellow">&lt;enter&gt;</Text> proceed
					{!isFirstRootPrompt && (
						<>
							, <Text color="yellow">&lt;escape&gt;</Text> go back
						</>
					)}
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [
		disabled,
		completed,
		isFirstRootPrompt,
		allowBack,
		showNumbers,
		searchable,
		filteredOptions.length,
	]); // Removed onHintChange from dependencies

	useInput((input, key) => {
		if (disabled || submitted) return;

		// Handle back navigation (Escape)
		if (key.escape && allowBack) {
			if (onBack) {
				onBack();
			}
			return;
		}

		// Handle arrow navigation for groups
		if (enableArrowNavigation && onNavigate) {
			if (key.upArrow && !isFirstInGroup) {
				onNavigate("up");
				return;
			}
			if (key.downArrow && !isLastInGroup) {
				onNavigate("down");
				return;
			}
		}

		if (key.return) {
			if (filteredOptions.length > 0) {
				const selectedValue = filteredOptions[selectedIndex].value;
				setSubmitted(true);
				onSubmit(selectedValue);
			}
			return;
		}

		// Handle search input if searchable is enabled
		if (searchable && !key.ctrl && !key.meta && input.length === 1) {
			// Allow typing for search
			if (input.match(/[a-zA-Z0-9\s]/)) {
				const newQuery = searchQuery + input;
				setSearchQuery(newQuery);
				return;
			}
		}

		// Handle backspace for search
		if (searchable && (key.backspace || key.delete || input === "\b")) {
			const newQuery = searchQuery.slice(0, -1);
			setSearchQuery(newQuery);
			return;
		}

		// Handle left/right arrow navigation in options
		if (key.leftArrow && !enableArrowNavigation) {
			const newIndex =
				selectedIndex > 0
					? selectedIndex - 1
					: allowLoop
					? filteredOptions.length - 1
					: selectedIndex;
			setSelectedIndex(newIndex);
			return;
		}

		if (key.rightArrow && !enableArrowNavigation) {
			const newIndex =
				selectedIndex < filteredOptions.length - 1
					? selectedIndex + 1
					: allowLoop
					? 0
					: selectedIndex;
			setSelectedIndex(newIndex);
			return;
		}

		// Handle up/down arrow navigation in options (if not used for group navigation)
		if (key.upArrow && !enableArrowNavigation) {
			const newIndex = allowLoop
				? selectedIndex > 0
					? selectedIndex - 1
					: filteredOptions.length - 1
				: Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);
			return;
		}

		if (key.downArrow && !enableArrowNavigation) {
			const newIndex = allowLoop
				? selectedIndex < filteredOptions.length - 1
					? selectedIndex + 1
					: 0
				: Math.min(filteredOptions.length - 1, selectedIndex + 1);
			setSelectedIndex(newIndex);
			return;
		}

		// Handle number keys for direct selection (only if showNumbers is enabled)
		if (showNumbers === true) {
			const num = parseInt(input);
			if (!isNaN(num) && num >= 1 && num <= filteredOptions.length) {
				const newIndex = num - 1;
				setSelectedIndex(newIndex);
				const selectedValue = filteredOptions[newIndex].value;
				setSubmitted(true);
				onSubmit(selectedValue);
				return;
			}
		}
	});

	// Show completed state
	if (completed && completedValue !== undefined) {
		const completedOption = options.find(
			(option) => option.value === completedValue
		);
		const displayLabel = completedOption
			? completedOption.label
			: completedValue;

		return (
			<Box
				marginBottom={isLastInGroup && flow === "phased" ? 1 : 0}
				marginTop={isFirstInGroup ? 0 : 0}
			>
				<Text color="green">✓</Text>
				<Text color="gray" dimColor>
					{" "}
					{shortLabel || label}:{" "}
				</Text>
				<Text>{displayLabel}</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			marginBottom={isLastInGroup && flow === "phased" ? 1 : 0}
			marginTop={isFirstInGroup ? 0 : 0}
		>
			<Text>{label}</Text>
			{searchable && (
				<Text color="blue">
					Search: {searchQuery || "(type to search)"}
				</Text>
			)}
			{filteredOptions.map((option, index) => {
				const isSelected = index === selectedIndex;
				return (
					<Text
						key={option.value}
						color={isSelected ? "cyan" : "gray"}
					>
						{isSelected ? "●" : "○"}{" "}
						{showNumbers === true && `${index + 1}. `}
						{option.label}
					</Text>
				);
			})}
			{searchable &&
				filteredOptions.length === 0 &&
				searchQuery.trim() && (
					<Text color="red">No options match "{searchQuery}"</Text>
				)}
		</Box>
	);
}
